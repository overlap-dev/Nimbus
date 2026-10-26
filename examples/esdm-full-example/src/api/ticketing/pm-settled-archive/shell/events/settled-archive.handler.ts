import { createCommand, type Event, getLogger } from '@nimbus-cqrs/core';
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
} from '@nimbus-cqrs/eventsourcingdb';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getCommandRouter } from '../../../../command.router.ts';
import { observerCheckpointsRepository } from '../../../../shared/lib/eventsourcingdb/observer-checkpoints.repository.ts';
import type { ObserverConsumer } from '../../../../shared/lib/eventsourcingdb/observer-group.ts';
import { toError } from '../../../../shared/lib/toError.ts';
import { CLOUDEVENTS_SOURCE } from '../../../../shared/namespace.ts';
import {
    ARCHIVE_TICKET_COMMAND_TYPE,
    type ArchiveTicketCommand,
} from '../../../agg-ticket/core/commands/archive.command.ts';
import { ticketEventSchema } from '../../../agg-ticket/core/domain/ticket.state.ts';
import { ticketsSubject } from '../../../agg-ticket/core/domain/ticket.subjects.ts';
import {
    applySettledArchive,
    isArchiveDue,
    SETTLED_ARCHIVE_EVENT_TYPES,
    signalFromTicketEvent,
} from '../../core/domain/settled-archive.state.ts';
import { settledArchiveRepository } from '../stores/settled-archive.repository.ts';

export const TICKETING_SETTLED_ARCHIVE_CONSUMER_NAME =
    'ticketing.settled-archive';

const DUE_SCAN_INTERVAL_MS = 15 * 60 * 1000;

/**
 * The timer reaction: emits archive for the Ticket. The command carries no
 * authcontext because the settled-archive watch is a system actor.
 */
const routeArchive = async (ticketId: string): Promise<void> => {
    const command = createCommand({
        type: ARCHIVE_TICKET_COMMAND_TYPE,
        source: CLOUDEVENTS_SOURCE,
        data: { ticketId },
        authcontext: null,
    }) as ArchiveTicketCommand;

    await getCommandRouter().route(command);
};

export const dispatchDueArchives = async (now: string): Promise<void> => {
    const due = await settledArchiveRepository.listDue(now);

    for (const instance of due) {
        if (!isArchiveDue(instance, now)) {
            continue;
        }

        try {
            await routeArchive(instance.ticketId);
        } catch (error) {
            getLogger().warn({
                message:
                    'Settled archive could not archive a Ticket whose wait is due',
                data: { ticketId: instance.ticketId },
                error: toError(error),
            });
        }
    }
};

const latestTicketEventId = async (): Promise<string | null> => {
    const controller = new AbortController();
    let latest: string | null = null;

    try {
        for await (const event of readEvents(
            ticketsSubject(),
            {
                recursive: true,
                order: 'antichronological',
            },
            controller.signal,
        )) {
            latest = event.id;
            controller.abort();
            break;
        }
    } catch (error) {
        if (!controller.signal.aborted) {
            throw error;
        }
    }

    return latest;
};

/**
 * The timer only fires on state the watch has fully caught up with, so a
 * Ticket that left done just now is never archived by a stale instance.
 */
const watchIsCaughtUp = async (): Promise<boolean> => {
    const latest = await latestTicketEventId();

    if (latest === null) {
        return true;
    }

    const positions = await observerCheckpointsRepository.getPositions([
        TICKETING_SETTLED_ARCHIVE_CONSUMER_NAME,
    ]);
    const checkpoint = positions.get(TICKETING_SETTLED_ARCHIVE_CONSUMER_NAME);

    return checkpoint !== undefined && BigInt(checkpoint) >= BigInt(latest);
};

/**
 * The event reactions: folds status-changed and archived into the instance
 * correlated by ticket-id.
 */
export const handleSettledArchive = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
): Promise<void> => {
    const event = ticketEventSchema.parse(
        eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
    );
    const signal = signalFromTicketEvent(event);

    if (signal === null) {
        return;
    }

    const previous = await settledArchiveRepository.getByTicketId(
        signal.ticketId,
    );
    const next = applySettledArchive(previous, signal);

    await settledArchiveRepository.save(next);
};

const scanDueArchives = async (): Promise<void> => {
    if (!(await watchIsCaughtUp())) {
        getLogger().warn({
            message: 'Settled archive watch is not caught up!',
        });

        return;
    }

    await dispatchDueArchives(new Date().toISOString());
};

/**
 * Polls for archive-due timers that have fired. The interval never keeps
 * the process alive on its own.
 */
export const startSettledArchiveWatch = (): void => {
    const timer = setInterval(() => {
        scanDueArchives().catch((error: unknown) => {
            getLogger().error({
                message: 'Settled archive due scan failed',
                error: toError(error),
            });
        });
    }, DUE_SCAN_INTERVAL_MS);

    timer.unref();
};

export const ticketingSettledArchiveConsumer: ObserverConsumer = {
    name: TICKETING_SETTLED_ARCHIVE_CONSUMER_NAME,
    handles: (event: Event) => {
        return SETTLED_ARCHIVE_EVENT_TYPES.has(event.type);
    },
    apply: handleSettledArchive,
};

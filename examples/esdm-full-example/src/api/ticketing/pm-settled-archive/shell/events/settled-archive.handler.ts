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
import { replayTicket } from '../../../agg-ticket/shell/replay.ts';
import {
    applySettledArchive,
    archiveDueFrom,
    isArchiveDue,
    SETTLED_ARCHIVE_EVENT_TYPES,
    type SettledArchiveState,
    signalFromTicketEvent,
} from '../../core/domain/settled-archive.state.ts';
import { settledArchiveRepository } from '../stores/settled-archive.repository.ts';

// A process manager follows one process over time and acts when it is due.
//
// settled-archive watches each ticket. Two reactions share that watch:
//
// - Events. status-changed and archived update the instance. The fold is
//   applySettledArchive() in the core. This handler loads, applies, saves.
// - Time. Every 15 minutes, tickets whose wait has elapsed are archived
//   by routing the archive command. There is no HTTP route for it.
//   The command router still enforces the archive rules.
//
// The timer only runs once this consumer has caught up with the log.
// Archiving also replays the ticket: the wait has to be the one armed
// by the latest transition into done, and the command carries that
// stream head. The append precondition rejects the write if a newer
// event landed after the decision. A ticket that leaves done and
// re-enters it is not archived on the old timer.
export const TICKETING_SETTLED_ARCHIVE_CONSUMER_NAME =
    'ticketing.settled-archive';

const DUE_SCAN_INTERVAL_MS = 15 * 60 * 1000;

/**
 * The timer reaction: emits archive for the Ticket. The command carries no
 * authcontext because the settled-archive watch is a system actor.
 */
const routeArchive = async (instance: SettledArchiveState): Promise<void> => {
    const { lastEventId, enteredDoneAt } = await replayTicket(
        instance.ticketId,
    );

    // The stored timer can be behind the log: the ticket may have left
    // done and entered it again after the catch-up check. Only the wait
    // armed by the current transition into done may archive.
    if (
        instance.archiveDueAt === undefined ||
        lastEventId === null ||
        enteredDoneAt === null ||
        archiveDueFrom(enteredDoneAt) !== instance.archiveDueAt
    ) {
        return;
    }

    const command = createCommand({
        type: ARCHIVE_TICKET_COMMAND_TYPE,
        source: CLOUDEVENTS_SOURCE,
        data: {
            ticketId: instance.ticketId,
            observedEventId: lastEventId,
        },
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
            // One Ticket at a time, so one failure is logged and the rest still run.
            await routeArchive(instance); // NOSONAR
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
    // Antichronological, so the first event is the newest. Read only that one.
    const iterator = readEvents(
        ticketsSubject(),
        {
            recursive: true,
            order: 'antichronological',
        },
        controller.signal,
    )[Symbol.asyncIterator]();

    let latest: string | null = null;
    let failure: unknown;

    try {
        const first = await iterator.next();

        if (!first.done) {
            latest = first.value.id;
            controller.abort();
        }
    } catch (error) {
        failure = error;
    }

    try {
        await iterator.return();
    } catch (error) {
        if (!controller.signal.aborted) {
            failure = error;
        }
    }

    if (failure !== undefined && !controller.signal.aborted) {
        throw failure;
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

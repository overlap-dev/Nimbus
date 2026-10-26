import { type Event, getEnv, getLogger } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { findDemoUserById } from '../../../../iam/dcb-auth/shell/demo-users.ts';
import { renderMailHtmlFromTemplate } from '../../../../shared/ext-mailing/render-mail-html.ts';
import { sendMail } from '../../../../shared/ext-mailing/send-mail.ts';
import type { ObserverConsumer } from '../../../../shared/lib/eventsourcingdb/observer-group.ts';
import { logCorrelationId } from '../../../../shared/lib/logging.ts';
import { ticketingTicketsRepository } from '../../../rm-tickets/shell/stores/tickets.repository.ts';
import {
    TICKET_ASSIGNED_EVENT_TYPE,
    ticketAssignedEventSchema,
} from '../../core/events/assigned.event.ts';
import { notifiedAssignmentsRepository } from '../stores/notified-assignments.repository.ts';

/**
 * Event handler `notify-assignee`: emails the new Assignee that a Ticket
 * was assigned to them. Owns its idempotency — it remembers the ids of the
 * assigned events it has emailed for and skips a redelivered one.
 *
 * The Ticket title comes from the tickets read model, which is declared
 * before this consumer in the observer group and therefore already holds
 * this event. The Assignee's address comes from the mocked IAM Users.
 */
export const handleNotifyAssignee = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
): Promise<void> => {
    const event = ticketAssignedEventSchema.parse(
        eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
    );

    if (await notifiedAssignmentsRepository.wasNotified(event.id)) {
        return;
    }

    const assignee = findDemoUserById(event.data.assignee);
    const ticket = await ticketingTicketsRepository.getByTicketId(
        event.data.ticketId,
    );

    if (assignee === null || ticket === null) {
        getLogger().warn({
            category: 'Ticketing',
            message: 'notify-assignee skipped: unknown Assignee or Ticket',
            data: {
                ticketId: event.data.ticketId,
                assignee: event.data.assignee,
            },
            ...logCorrelationId(event),
        });

        return;
    }

    const env = getEnv({ variables: ['APP_ORIGIN'] });
    const ticketUrl = new URL(`/tickets/${ticket.ticketId}`, env.APP_ORIGIN);

    const html = await renderMailHtmlFromTemplate('ticket-assigned', {
        name: assignee.name,
        title: ticket.title,
        ticketUrl: ticketUrl.toString(),
    });

    await sendMail({
        to: assignee.email,
        subject: `[Tickets] "${ticket.title}" was assigned to you`,
        html,
    });

    await notifiedAssignmentsRepository.markNotified(event.id);
};

export const ticketingNotifyAssigneeConsumer: ObserverConsumer = {
    name: 'ticketing.ticket.notify-assignee',
    handles: (event: Event) => {
        return event.type === TICKET_ASSIGNED_EVENT_TYPE;
    },
    apply: handleNotifyAssignee,
};

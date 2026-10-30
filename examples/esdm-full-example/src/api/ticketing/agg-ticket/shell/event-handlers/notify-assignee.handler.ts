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

// An event handler reacts to an event with a side effect that is not
// another command. Here the side effect is an email to the new assignee.
//
// It does not change the ticket. The title comes from the tickets read
// model. That consumer is declared first in the observer group, so this
// event is already in the projection when we read it. The address comes
// from the mocked IAM users.
//
// Delivery is at-least-once. A committed notified-assignments row skips
// a redelivery. A crash after SMTP accepts the message and before that
// write sends the same mail again.
//
// A missing ticket is a failure, not a skip. The tickets projection is
// declared first, but if it halted, checkpointing this handler would
// drop the mail for good. The observer retries, then halts this consumer.
export const handleNotifyAssignee = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
): Promise<void> => {
    const env = getEnv({ variables: ['APP_ORIGIN'] });

    const event = ticketAssignedEventSchema.parse(
        eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
    );

    if (await notifiedAssignmentsRepository.wasNotified(event.id)) {
        return;
    }

    const ticket = await ticketingTicketsRepository.getByTicketId(
        event.data.ticketId,
    );

    if (ticket === null) {
        throw new Error(
            `Ticket ${event.data.ticketId} is missing from the projection`,
        );
    }

    const assignee = findDemoUserById(event.data.assignee);

    if (assignee === null) {
        getLogger().warn({
            category: 'Ticketing',
            message: 'notify-assignee skipped: unknown Assignee',
            data: {
                ticketId: event.data.ticketId,
                assignee: event.data.assignee,
            },
            ...logCorrelationId(event),
        });

        return;
    }

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

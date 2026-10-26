import { createCommand, type Event } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getCommandRouter } from '../../../../command.router.ts';
import type { AuthContext } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import type { ObserverConsumer } from '../../../../shared/lib/eventsourcingdb/observer-group.ts';
import { SYSTEM_ACTOR } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_SOURCE } from '../../../../shared/namespace.ts';
import {
    CHANGE_STATUS_COMMAND_TYPE,
    type ChangeStatusCommand,
} from '../../core/commands/change-status.command.ts';
import { TICKET_STATUS_IN_PROGRESS } from '../../core/domain/status.value-object.ts';
import {
    TICKET_ASSIGNED_EVENT_TYPE,
    type TicketAssignedEvent,
    ticketAssignedEventSchema,
} from '../../core/events/assigned.event.ts';

const POLICY_SESSION_ID = '00000000-0000-4000-8000-000000000002';
const POLICY_SESSION_EXPIRES_AT = '9999-12-31T23:59:59.000Z';

/**
 * The policy acts on behalf of the User who assigned the Ticket, so the
 * status-changed event names that User as actor.
 */
const authContextFor = (userId: string): AuthContext => {
    return {
        sessionId: POLICY_SESSION_ID,
        userId,
        expiresAt: POLICY_SESSION_EXPIRES_AT,
    };
};

/**
 * Maps one assigned event onto the change-status command the policy
 * issues: always in-progress (`always-in-progress`). Pure.
 */
export const startWorkOnAssignment = (
    event: TicketAssignedEvent,
): ChangeStatusCommand => {
    if (event.data.actor === SYSTEM_ACTOR) {
        throw new Error('The assigning actor is not a User');
    }

    return createCommand({
        type: CHANGE_STATUS_COMMAND_TYPE,
        source: CLOUDEVENTS_SOURCE,
        correlationid: event.correlationid,
        data: {
            ticketId: event.data.ticketId,
            status: TICKET_STATUS_IN_PROGRESS,
        },
        authcontext: authContextFor(event.data.actor),
    }) as ChangeStatusCommand;
};

export const handleStartWorkOnAssignment = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
): Promise<void> => {
    const event = ticketAssignedEventSchema.parse(
        eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
    );

    await getCommandRouter().route(startWorkOnAssignment(event));
};

/**
 * Policy `start-work-on-assignment`: whenever a Ticket is assigned, work
 * on it starts. Stateless; a redelivered assigned event is harmless because
 * change-status to the current Status changes nothing.
 */
export const ticketingStartWorkOnAssignmentConsumer: ObserverConsumer = {
    name: 'ticketing.ticket.start-work-on-assignment',
    handles: (event: Event) => {
        return event.type === TICKET_ASSIGNED_EVENT_TYPE;
    },
    apply: handleStartWorkOnAssignment,
};

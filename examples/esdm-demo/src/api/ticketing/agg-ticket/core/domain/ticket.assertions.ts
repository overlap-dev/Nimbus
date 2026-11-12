import { ForbiddenException } from '@nimbus-cqrs/core';
import type { AuthContext } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import {
    TICKET_STATUS_DONE,
    TICKET_STATUS_IN_PROGRESS,
    type TicketStatus,
} from './status.value-object.ts';
import {
    inProgressRequiresAssigneeException,
    ticketAlreadyExistsException,
    ticketNotDoneException,
    ticketNotFoundException,
} from './ticket.exceptions.ts';
import type { Ticket, TicketState } from './ticket.state.ts';

// In the assertions file we can define helper functions
// to validate the state to enforce business rules and invariants
// in the domain.
// These assertions are typically called in the core logic of the commands
// or within event handlers, policies and process managers.

export const requireNoTicket = (state: TicketState): void => {
    if (state !== null) {
        throw ticketAlreadyExistsException();
    }
};

export const requireTicket = (state: TicketState): Ticket => {
    if (state === null) {
        throw ticketNotFoundException();
    }

    return state;
};

/** Invariant `in-progress-has-assignee`. */
export const requireInProgressHasAssignee = (
    ticket: Ticket,
    status: TicketStatus,
): void => {
    if (status === TICKET_STATUS_IN_PROGRESS && ticket.assignee === undefined) {
        throw inProgressRequiresAssigneeException();
    }
};

/** Constraint `only-while-done` of the archive command. */
export const requireDone = (ticket: Ticket): void => {
    if (ticket.status !== TICKET_STATUS_DONE) {
        throw ticketNotDoneException();
    }
};

/**
 * Commands whose only actor is the `settled-archive` system actor are
 * internal-only: a signed-in User cannot issue them.
 */
export const requireSystemActor = (authcontext: AuthContext | null): void => {
    if (authcontext !== null) {
        throw new ForbiddenException('Forbidden', { errorCode: 'FORBIDDEN' });
    }
};

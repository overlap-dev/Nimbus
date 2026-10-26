import type { AuthContext } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { CLOUDEVENTS_SOURCE } from '../../../../shared/namespace.ts';
import { TICKET_STATUS_NEW } from './status.value-object.ts';
import type { Ticket, TicketState } from './ticket.state.ts';

export const actorUserId = '11111111-1111-4111-8111-111111111111';
export const sessionId = '22222222-2222-4222-8222-222222222222';
export const ticketId = '33333333-3333-4333-8333-333333333333';
export const assigneeId = '66666666-6666-4666-8666-666666666666';
export const source = CLOUDEVENTS_SOURCE;

export const absent: TicketState = null;

export const ticket = (overrides: Partial<Ticket> = {}): Ticket => {
    return {
        ticketId,
        title: 'Water damage in room 204',
        reporter: actorUserId,
        status: TICKET_STATUS_NEW,
        archived: false,
        ...overrides,
    };
};

export const makeAuthContext = (
    overrides: Partial<AuthContext> = {},
): AuthContext => {
    return {
        sessionId,
        userId: actorUserId,
        expiresAt: '2026-08-13T13:00:00.000Z',
        ...overrides,
    };
};

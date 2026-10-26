import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TICKET_STATUS_NEW } from '../domain/status.value-object.ts';
import { applyEventToState } from '../domain/ticket.state.ts';
import { ticketSubject } from '../domain/ticket.subjects.ts';
import {
    absent,
    actorUserId,
    makeAuthContext,
    source,
    ticket,
    ticketId,
} from '../domain/ticket.test-fixtures.ts';
import { TICKET_CREATED_EVENT_TYPE } from '../events/created.event.ts';
import {
    CREATE_TICKET_COMMAND_TYPE,
    type CreateTicketCommand,
    createTicket,
} from './create.command.ts';

const makeCommand = (
    data: Partial<CreateTicketCommand['data']> = {},
): CreateTicketCommand => {
    return {
        type: CREATE_TICKET_COMMAND_TYPE,
        source,
        correlationid: 'corr',
        authcontext: makeAuthContext(),
        data: {
            title: 'Water damage in room 204',
            ...data,
        },
    } as CreateTicketCommand;
};

test('a User opens a Ticket and becomes its Reporter', () => {
    const events = createTicket(
        absent,
        makeCommand({ description: 'Ceiling is dripping.' }),
        ticketId,
    );

    assert.equal(events.length, 1);
    assert.equal(events[0].type, TICKET_CREATED_EVENT_TYPE);
    assert.equal(events[0].subject, ticketSubject(ticketId));
    assert.deepEqual(events[0].data, {
        actor: actorUserId,
        ticketId,
        title: 'Water damage in room 204',
        description: 'Ceiling is dripping.',
        reporter: actorUserId,
    });
});

test('a new Ticket starts new, unassigned and not archived', () => {
    const [created] = createTicket(absent, makeCommand(), ticketId);
    const state = applyEventToState(absent, created);

    assert.deepEqual(state, {
        ticketId,
        title: 'Water damage in room 204',
        reporter: actorUserId,
        status: TICKET_STATUS_NEW,
        archived: false,
    });
});

test('a Ticket id cannot be taken twice', () => {
    assert.throws(
        () => {
            createTicket(ticket(), makeCommand(), ticketId);
        },
        { message: 'Ticket already exists' },
    );
});

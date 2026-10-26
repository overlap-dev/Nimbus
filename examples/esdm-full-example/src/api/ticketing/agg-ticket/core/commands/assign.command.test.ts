import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEventToState } from '../domain/ticket.state.ts';
import {
    absent,
    actorUserId,
    assigneeId,
    makeAuthContext,
    source,
    ticket,
    ticketId,
} from '../domain/ticket.test-fixtures.ts';
import { TICKET_ASSIGNED_EVENT_TYPE } from '../events/assigned.event.ts';
import {
    ASSIGN_TICKET_COMMAND_TYPE,
    type AssignTicketCommand,
    assignTicket,
} from './assign.command.ts';

const makeCommand = (
    data: Partial<AssignTicketCommand['data']> = {},
): AssignTicketCommand => {
    return {
        type: ASSIGN_TICKET_COMMAND_TYPE,
        source,
        correlationid: 'corr',
        authcontext: makeAuthContext(),
        data: {
            ticketId,
            assignee: assigneeId,
            ...data,
        },
    } as AssignTicketCommand;
};

test('a User assigns a Ticket', () => {
    const events = assignTicket(ticket(), makeCommand());

    assert.equal(events.length, 1);
    assert.equal(events[0].type, TICKET_ASSIGNED_EVENT_TYPE);
    assert.equal(events[0].data.assignee, assigneeId);
    assert.equal(events[0].data.actor, actorUserId);

    const next = applyEventToState(ticket(), events[0]);
    assert.equal(next?.assignee, assigneeId);
});

test('assigning replaces the previous Assignee', () => {
    const events = assignTicket(
        ticket({ assignee: actorUserId }),
        makeCommand(),
    );

    assert.equal(events[0].data.assignee, assigneeId);
});

test('assigning the current Assignee again changes nothing', () => {
    const events = assignTicket(
        ticket({ assignee: assigneeId }),
        makeCommand(),
    );

    assert.deepEqual(events, []);
});

test('an unknown Ticket cannot be assigned', () => {
    assert.throws(
        () => {
            assignTicket(absent, makeCommand());
        },
        { message: 'Ticket not found' },
    );
});

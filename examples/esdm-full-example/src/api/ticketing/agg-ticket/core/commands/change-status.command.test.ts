import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    TICKET_STATUS_DONE,
    TICKET_STATUS_IN_PROGRESS,
    TICKET_STATUS_NEW,
    TICKET_STATUS_OPEN,
} from '../domain/status.value-object.ts';
import { applyEventToState } from '../domain/ticket.state.ts';
import {
    actorUserId,
    assigneeId,
    makeAuthContext,
    source,
    ticket,
    ticketId,
} from '../domain/ticket.test-fixtures.ts';
import { TICKET_STATUS_CHANGED_EVENT_TYPE } from '../events/status-changed.event.ts';
import {
    CHANGE_STATUS_COMMAND_TYPE,
    type ChangeStatusCommand,
    changeStatus,
} from './change-status.command.ts';

const makeCommand = (
    data: Partial<ChangeStatusCommand['data']> = {},
): ChangeStatusCommand => {
    return {
        type: CHANGE_STATUS_COMMAND_TYPE,
        source,
        correlationid: 'corr',
        authcontext: makeAuthContext(),
        data: {
            ticketId,
            status: TICKET_STATUS_OPEN,
            ...data,
        },
    } as ChangeStatusCommand;
};

test('a User moves a Ticket to open', () => {
    const events = changeStatus(ticket(), makeCommand());

    assert.equal(events.length, 1);
    assert.equal(events[0].type, TICKET_STATUS_CHANGED_EVENT_TYPE);
    assert.equal(events[0].data.status, TICKET_STATUS_OPEN);
    assert.equal(events[0].data.actor, actorUserId);

    const next = applyEventToState(ticket(), events[0]);
    assert.equal(next?.status, TICKET_STATUS_OPEN);
});

test('moving to in-progress requires an Assignee', () => {
    assert.throws(
        () => {
            changeStatus(
                ticket(),
                makeCommand({ status: TICKET_STATUS_IN_PROGRESS }),
            );
        },
        { message: 'A Ticket in-progress always has an Assignee' },
    );
});

test('an assigned Ticket may move to in-progress', () => {
    const events = changeStatus(
        ticket({ assignee: assigneeId }),
        makeCommand({ status: TICKET_STATUS_IN_PROGRESS }),
    );

    assert.equal(events[0].data.status, TICKET_STATUS_IN_PROGRESS);
});

test('any Status may move to any other', () => {
    const events = changeStatus(
        ticket({ assignee: assigneeId, status: TICKET_STATUS_IN_PROGRESS }),
        makeCommand({ status: TICKET_STATUS_DONE }),
    );

    assert.equal(events[0].data.status, TICKET_STATUS_DONE);
});

test('moving to the current Status changes nothing', () => {
    const events = changeStatus(
        ticket(),
        makeCommand({ status: TICKET_STATUS_NEW }),
    );

    assert.deepEqual(events, []);
});

test('changing Status does not unarchive', () => {
    const [event] = changeStatus(ticket({ archived: true }), makeCommand());
    const next = applyEventToState(ticket({ archived: true }), event);

    assert.equal(next?.archived, true);
});

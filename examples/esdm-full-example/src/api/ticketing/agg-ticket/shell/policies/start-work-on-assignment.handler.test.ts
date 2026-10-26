import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SYSTEM_ACTOR } from '../../../../shared/lib/messages.ts';
import { CHANGE_STATUS_COMMAND_TYPE } from '../../core/commands/change-status.command.ts';
import { TICKET_STATUS_IN_PROGRESS } from '../../core/domain/status.value-object.ts';
import { ticketSubject } from '../../core/domain/ticket.subjects.ts';
import {
    actorUserId,
    assigneeId,
    source,
    ticketId,
} from '../../core/domain/ticket.test-fixtures.ts';
import {
    TICKET_ASSIGNED_EVENT_TYPE,
    type TicketAssignedEvent,
} from '../../core/events/assigned.event.ts';
import { startWorkOnAssignment } from './start-work-on-assignment.handler.ts';

const assigned = (actor: string = actorUserId): TicketAssignedEvent => {
    return {
        specversion: '1.0',
        id: '7',
        source,
        subject: ticketSubject(ticketId),
        type: TICKET_ASSIGNED_EVENT_TYPE,
        time: '2026-01-01T00:00:00.000Z',
        correlationid: 'corr',
        data: { actor, ticketId, assignee: assigneeId },
    } as TicketAssignedEvent;
};

test('an assigned Ticket moves to in-progress on behalf of the assigner', () => {
    const command = startWorkOnAssignment(assigned());

    assert.equal(command.type, CHANGE_STATUS_COMMAND_TYPE);
    assert.deepEqual(command.data, {
        ticketId,
        status: TICKET_STATUS_IN_PROGRESS,
    });
    assert.equal(command.authcontext.userId, actorUserId);
    assert.equal(command.correlationid, 'corr');
});

test('a system assignment has no User to act for', () => {
    assert.throws(
        () => {
            startWorkOnAssignment(assigned(SYSTEM_ACTOR));
        },
        { message: 'The assigning actor is not a User' },
    );
});

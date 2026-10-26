import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    TICKET_STATUS_DONE,
    TICKET_STATUS_OPEN,
    type TicketStatus,
} from '../../../agg-ticket/core/domain/status.value-object.ts';
import { TICKET_ASSIGNED_EVENT_TYPE } from '../../../agg-ticket/core/events/assigned.event.ts';
import { TICKET_STATUS_CHANGED_EVENT_TYPE } from '../../../agg-ticket/core/events/status-changed.event.ts';
import {
    applySettledArchive,
    archiveDueFrom,
    foldSettledArchive,
    isArchiveDue,
    isSettledArchiveEnded,
    type SettledArchiveSignal,
    signalFromTicketEvent,
} from './settled-archive.state.ts';

const ticketId = '33333333-3333-4333-8333-333333333333';
const entered = '2026-01-01T00:00:00.000Z';
const later = '2026-01-11T00:00:00.000Z';
const due = archiveDueFrom(entered);

const statusChanged = (
    time: string,
    status: TicketStatus,
): SettledArchiveSignal => {
    return { type: 'status-changed', ticketId, time, status };
};

const archived = (time: string): SettledArchiveSignal => {
    return { type: 'archived', ticketId, time };
};

test('only status-changed and archived become signals', () => {
    assert.deepEqual(
        signalFromTicketEvent({
            type: TICKET_STATUS_CHANGED_EVENT_TYPE,
            time: entered,
            data: { ticketId, status: TICKET_STATUS_DONE },
        }),
        { type: 'status-changed', ticketId, time: entered, status: 'done' },
    );
    assert.equal(
        signalFromTicketEvent({
            type: TICKET_ASSIGNED_EVENT_TYPE,
            time: entered,
            data: { ticketId },
        }),
        null,
    );
});

test('the watch starts with the first status-changed', () => {
    const state = applySettledArchive(
        null,
        statusChanged(entered, TICKET_STATUS_OPEN),
    );

    assert.equal(state.status, TICKET_STATUS_OPEN);
    assert.equal(state.archived, false);
    assert.equal(state.archiveDueAt, undefined);
});

test('entering done arms archive-due thirty days later', () => {
    const state = foldSettledArchive([
        statusChanged(entered, TICKET_STATUS_DONE),
    ]);

    assert.equal(state?.archiveDueAt, due);
    assert.equal(isArchiveDue(state!, later), false);
    assert.equal(isArchiveDue(state!, due), true);
});

test('a redelivered done leaves the running wait as it is', () => {
    const state = foldSettledArchive([
        statusChanged(entered, TICKET_STATUS_DONE),
        statusChanged(later, TICKET_STATUS_DONE),
    ]);

    assert.equal(state?.archiveDueAt, due);
});

test('leaving done cancels the wait; entering again starts a new one', () => {
    const left = foldSettledArchive([
        statusChanged(entered, TICKET_STATUS_DONE),
        statusChanged(later, TICKET_STATUS_OPEN),
    ]);
    assert.equal(left?.archiveDueAt, undefined);

    const again = applySettledArchive(
        left,
        statusChanged(later, TICKET_STATUS_DONE),
    );
    assert.equal(again.archiveDueAt, archiveDueFrom(later));
});

test('archived ends the watch and cancels archive-due', () => {
    const state = foldSettledArchive([
        statusChanged(entered, TICKET_STATUS_DONE),
        archived(due),
    ]);

    assert.equal(state?.archived, true);
    assert.equal(state?.archiveDueAt, undefined);
    assert.equal(isSettledArchiveEnded(state!), true);
    assert.equal(isArchiveDue(state!, due), false);
});

test('an archived Ticket never arms the timer again', () => {
    const state = foldSettledArchive([
        statusChanged(entered, TICKET_STATUS_DONE),
        archived(due),
        statusChanged(due, TICKET_STATUS_OPEN),
        statusChanged(due, TICKET_STATUS_DONE),
    ]);

    assert.equal(state?.archiveDueAt, undefined);
});

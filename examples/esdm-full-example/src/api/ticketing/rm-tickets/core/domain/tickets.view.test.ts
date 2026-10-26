import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    TICKET_STATUS_DONE,
    TICKET_STATUS_NEW,
    TICKET_STATUS_OPEN,
} from '../../../agg-ticket/core/domain/status.value-object.ts';
import {
    actorUserId,
    assigneeId,
    ticketId,
} from '../../../agg-ticket/core/domain/ticket.test-fixtures.ts';
import type { TicketsDocument } from './tickets.ts';
import {
    matchesTicketsListFilters,
    sortTicketsByCreatedAt,
    toTicketDetailView,
    toTicketListItemView,
} from './tickets.view.ts';

const document = (
    overrides: Partial<TicketsDocument> = {},
): TicketsDocument => {
    return {
        _id: ticketId,
        ticketId,
        title: 'Water damage in room 204',
        reporter: actorUserId,
        status: TICKET_STATUS_NEW,
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
};

test('archived Tickets never match the list', () => {
    assert.equal(matchesTicketsListFilters(document(), {}), true);
    assert.equal(
        matchesTicketsListFilters(document({ archived: true }), {}),
        false,
    );
});

test('the status filter narrows the list', () => {
    const open = document({ status: TICKET_STATUS_OPEN });

    assert.equal(
        matchesTicketsListFilters(open, { status: TICKET_STATUS_OPEN }),
        true,
    );
    assert.equal(
        matchesTicketsListFilters(open, { status: TICKET_STATUS_DONE }),
        false,
    );
});

test('the list is newest first', () => {
    const older = document({
        ticketId: '44444444-4444-4444-8444-444444444444',
        createdAt: '2026-01-01T00:00:00.000Z',
    });
    const newer = document({
        ticketId: '55555555-5555-4555-8555-555555555555',
        createdAt: '2026-02-01T00:00:00.000Z',
    });

    assert.deepEqual(sortTicketsByCreatedAt([older, newer]), [newer, older]);
});

test('views carry the Ticket fields and omit absent optionals', () => {
    const item = toTicketListItemView(document());

    assert.equal('description' in item, false);
    assert.equal('assignee' in item, false);
    assert.equal('_id' in item, false);

    const detail = toTicketDetailView(
        document({ description: 'Ceiling is dripping', assignee: assigneeId }),
    );

    assert.equal(detail.description, 'Ceiling is dripping');
    assert.equal(detail.assignee, assigneeId);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEvent } from '@nimbus-cqrs/core';
import {
    TICKET_STATUS_IN_PROGRESS,
    TICKET_STATUS_NEW,
} from '../../../agg-ticket/core/domain/status.value-object.ts';
import { ticketSubject } from '../../../agg-ticket/core/domain/ticket.subjects.ts';
import {
    actorUserId,
    assigneeId,
    source,
    ticketId,
} from '../../../agg-ticket/core/domain/ticket.test-fixtures.ts';
import {
    TICKET_ARCHIVED_EVENT_TYPE,
    type TicketArchivedEvent,
} from '../../../agg-ticket/core/events/archived.event.ts';
import {
    TICKET_ASSIGNED_EVENT_TYPE,
    type TicketAssignedEvent,
} from '../../../agg-ticket/core/events/assigned.event.ts';
import {
    TICKET_CREATED_EVENT_TYPE,
    type TicketCreatedEvent,
} from '../../../agg-ticket/core/events/created.event.ts';
import {
    TICKET_STATUS_CHANGED_EVENT_TYPE,
    type TicketStatusChangedEvent,
} from '../../../agg-ticket/core/events/status-changed.event.ts';
import type { TicketEvent } from './tickets.events.ts';
import { applyTicketsProjection } from './tickets.projection.ts';

const created = createEvent({
    type: TICKET_CREATED_EVENT_TYPE,
    source,
    subject: ticketSubject(ticketId),
    data: {
        actor: actorUserId,
        ticketId,
        title: 'Water damage in room 204',
        reporter: actorUserId,
    },
}) as TicketCreatedEvent;

const assigned = createEvent({
    type: TICKET_ASSIGNED_EVENT_TYPE,
    source,
    subject: ticketSubject(ticketId),
    data: { actor: actorUserId, ticketId, assignee: assigneeId },
}) as TicketAssignedEvent;

const statusChanged = createEvent({
    type: TICKET_STATUS_CHANGED_EVENT_TYPE,
    source,
    subject: ticketSubject(ticketId),
    data: { actor: assigneeId, ticketId, status: TICKET_STATUS_IN_PROGRESS },
}) as TicketStatusChangedEvent;

const archived = createEvent({
    type: TICKET_ARCHIVED_EVENT_TYPE,
    source,
    subject: ticketSubject(ticketId),
    data: { actor: 'system', ticketId },
}) as TicketArchivedEvent;

const project = (events: readonly TicketEvent[]) => {
    return events.reduce<ReturnType<typeof applyTicketsProjection> | null>(
        (document, event) => {
            return applyTicketsProjection(document, event);
        },
        null,
    );
};

test('created adds the Ticket as new and not archived', () => {
    const document = project([created]);

    assert.deepEqual(document, {
        _id: ticketId,
        ticketId,
        title: 'Water damage in room 204',
        reporter: actorUserId,
        status: TICKET_STATUS_NEW,
        archived: false,
        createdAt: created.time,
        updatedAt: created.time,
    });
});

test('assigned, status-changed and archived update the Ticket', () => {
    const document = project([created, assigned, statusChanged, archived]);

    assert.equal(document?.assignee, assigneeId);
    assert.equal(document?.status, TICKET_STATUS_IN_PROGRESS);
    assert.equal(document?.archived, true);
    assert.equal(document?.createdAt, created.time);
    assert.equal(document?.updatedAt, archived.time);
});

test('an update for an unknown Ticket fails loudly', () => {
    assert.throws(() => {
        return applyTicketsProjection(null, assigned);
    }, /missing from the projection/);
});

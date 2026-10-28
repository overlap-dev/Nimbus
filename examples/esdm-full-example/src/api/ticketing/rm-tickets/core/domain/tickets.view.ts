import { z } from 'zod';
import {
    type TicketStatus,
    ticketStatusSchema,
} from '../../../agg-ticket/core/domain/status.value-object.ts';
import type { TicketsDocument } from './tickets.ts';

// The view is what a query returns. The document is what we store.
//
// Mapping sits in the query handler, so storage details stay inside the
// read model. Callers never see the MongoDB document.
//
// list-tickets never returns archived tickets. matchesTicketsListFilters
// is that rule in pure form. The repository applies the same rule as a
// MongoDB filter in findPage().
export const ticketListItemViewSchema = z.object({
    ticketId: z.uuid(),
    title: z.string(),
    description: z.string().optional(),
    reporter: z.uuid(),
    assignee: z.uuid().optional(),
    status: ticketStatusSchema,
    archived: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});
export type TicketListItemView = z.infer<typeof ticketListItemViewSchema>;

export const listTicketsResultSchema = z.object({
    items: z.array(ticketListItemViewSchema),
    total: z.number().int().nonnegative(),
});
export type ListTicketsResult = z.infer<typeof listTicketsResultSchema>;

export const ticketDetailViewSchema = ticketListItemViewSchema;
export type TicketDetailView = z.infer<typeof ticketDetailViewSchema>;

/** The optional filters of list-tickets. Archived Tickets are never listed. */
export type TicketsListFilters = { status?: TicketStatus };

export const matchesTicketsListFilters = (
    document: TicketsDocument,
    filters: TicketsListFilters,
): boolean => {
    if (document.archived) {
        return false;
    }

    return filters.status === undefined || document.status === filters.status;
};

const compareTicketsByCreatedAt = (
    left: TicketsDocument,
    right: TicketsDocument,
): number => {
    const created = right.createdAt.localeCompare(left.createdAt);

    if (created !== 0) {
        return created;
    }

    return left.ticketId.localeCompare(right.ticketId);
};

/** Newest `createdAt` first. */
export const sortTicketsByCreatedAt = (
    documents: readonly TicketsDocument[],
): TicketsDocument[] => {
    return [...documents].sort(compareTicketsByCreatedAt);
};

export const listTicketsMongoSort = (): { createdAt: -1; ticketId: 1 } => {
    return { createdAt: -1, ticketId: 1 };
};

export const toTicketListItemView = (
    document: TicketsDocument,
): TicketListItemView => {
    return {
        ticketId: document.ticketId,
        title: document.title,
        ...(document.description !== undefined
            ? { description: document.description }
            : {}),
        reporter: document.reporter,
        ...(document.assignee !== undefined
            ? { assignee: document.assignee }
            : {}),
        status: document.status,
        archived: document.archived,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
};

export const toTicketDetailView = (
    document: TicketsDocument,
): TicketDetailView => {
    return toTicketListItemView(document);
};

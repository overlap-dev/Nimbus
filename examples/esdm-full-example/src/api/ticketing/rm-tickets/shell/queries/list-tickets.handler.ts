import {
    type ListTicketsResult,
    type TicketsListFilters,
    toTicketListItemView,
} from '../../core/domain/tickets.view.ts';
import type { ListTicketsQuery } from '../../core/queries/list-tickets.query.ts';
import { ticketingTicketsRepository } from '../stores/tickets.repository.ts';

// A filtered, paged read of the same projection, mapped to list items.
export const listTicketsHandler = async (
    query: ListTicketsQuery,
): Promise<ListTicketsResult> => {
    const { status, offset, limit } = query.data;
    const filters: TicketsListFilters = {
        ...(status !== undefined ? { status } : {}),
    };
    const page = await ticketingTicketsRepository.findPage(filters, {
        offset,
        limit,
    });

    return {
        items: page.documents.map(toTicketListItemView),
        total: page.total,
    };
};

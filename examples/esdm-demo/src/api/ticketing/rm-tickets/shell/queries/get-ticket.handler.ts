import { ticketNotFoundException } from '../../../agg-ticket/core/domain/ticket.exceptions.ts';
import {
    type TicketDetailView,
    toTicketDetailView,
} from '../../core/domain/tickets.view.ts';
import type { GetTicketQuery } from '../../core/queries/get-ticket.query.ts';
import { ticketingTicketsRepository } from '../stores/tickets.repository.ts';

// Read one document from the projection and map it to the detail view.
// A missing document is a not-found error.
//
// The view mapping is what the caller receives. The stored document
// stays inside the repository.
export const getTicketHandler = async (
    query: GetTicketQuery,
): Promise<TicketDetailView> => {
    const document = await ticketingTicketsRepository.getByTicketId(
        query.data.ticketId,
    );

    if (document === null) {
        throw ticketNotFoundException();
    }

    return toTicketDetailView(document);
};

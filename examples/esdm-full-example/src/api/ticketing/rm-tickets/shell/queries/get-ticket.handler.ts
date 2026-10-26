import { ticketNotFoundException } from '../../../agg-ticket/core/domain/ticket.exceptions.ts';
import {
    type TicketDetailView,
    toTicketDetailView,
} from '../../core/domain/tickets.view.ts';
import type { GetTicketQuery } from '../../core/queries/get-ticket.query.ts';
import { ticketingTicketsRepository } from '../stores/tickets.repository.ts';

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

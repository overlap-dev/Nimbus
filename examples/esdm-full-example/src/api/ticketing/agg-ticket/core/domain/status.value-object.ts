import { z } from 'zod';

export const TICKET_STATUS_NEW = 'new' as const;
export const TICKET_STATUS_OPEN = 'open' as const;
export const TICKET_STATUS_IN_PROGRESS = 'in-progress' as const;
export const TICKET_STATUS_DONE = 'done' as const;

/** The stage a Ticket occupies in its workflow. */
export const ticketStatusSchema = z.enum([
    TICKET_STATUS_NEW,
    TICKET_STATUS_OPEN,
    TICKET_STATUS_IN_PROGRESS,
    TICKET_STATUS_DONE,
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

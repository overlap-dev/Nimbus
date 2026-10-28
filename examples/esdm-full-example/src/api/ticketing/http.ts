import { Hono } from 'hono';
import { ticketCommands } from './agg-ticket/shell/http.ts';
import { ticketsQueries } from './rm-tickets/shell/http.ts';

// Commands that change one ticket are mounted at /ticket.
// Queries that read the tickets projection are mounted at /tickets.
// The two sides do not share a model, so they do not share a path.
export const ticketingRoutes = new Hono();

ticketingRoutes.route('/ticket', ticketCommands);
ticketingRoutes.route('/tickets', ticketsQueries);

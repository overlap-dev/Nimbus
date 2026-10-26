import { Hono } from 'hono';
import { ticketCommands } from './agg-ticket/shell/http.ts';
import { ticketsQueries } from './rm-tickets/shell/http.ts';

export const ticketingRoutes = new Hono();

ticketingRoutes.route('/ticket', ticketCommands);
ticketingRoutes.route('/tickets', ticketsQueries);

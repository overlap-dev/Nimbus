import { Hono } from 'hono';
import { authCommands } from './dcb-auth/shell/http.ts';

export const iamRoutes = new Hono();

// COMMANDS
iamRoutes.route('/auth', authCommands);

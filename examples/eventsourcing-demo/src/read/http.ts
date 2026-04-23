import { Hono } from 'hono';
import httpUsersQueryRouter from './iam/users/http.ts';

const httpQueryRouter = new Hono();

httpQueryRouter.route('/iam/users', httpUsersQueryRouter);

export default httpQueryRouter;

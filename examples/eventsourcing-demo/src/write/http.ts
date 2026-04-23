import { Hono } from 'hono';
import httpUserCommandRouter from './iam/users/shell/http.ts';

const httpCommandRouter = new Hono();

httpCommandRouter.route('/iam/users', httpUserCommandRouter);

export default httpCommandRouter;

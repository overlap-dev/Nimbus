import { correlationId, handleError, logger } from '@nimbus/hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import usersRouter from '../../iam/users/shell/http/router.ts';

export const app = new Hono();

// TODO: document correlationId middleware
app.use(correlationId());

// TODO: document logger middleware and observability in general
app.use(logger({
    enableTracing: true,
    tracerName: 'api',
}));

app.use(cors());

app.use(secureHeaders());

app.use(compress());

app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});

app.route('/iam/users', usersRouter);

app.onError(handleError);

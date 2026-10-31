import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    type Command,
    InvalidInputException,
    type Query,
} from '@nimbus-cqrs/core';
import { Hono } from 'hono';
import { correlationId } from './middleware/correlationId.ts';
import { handleError } from './onError.ts';
import { routeCommand, routeQuery } from './routing.ts';

const SOURCE = 'https://nimbus.overlap.at';
const COMMAND_TYPE = 'at.overlap.nimbus.create-ticket';
const QUERY_TYPE = 'at.overlap.nimbus.list-tickets';

type RoutedMessage = (Command | Query) & {
    authcontext?: { userId: string };
};

const captureRouter = () => {
    let routed: RoutedMessage | undefined;

    return {
        routed: () => routed,
        router: {
            route: async (message: unknown) => {
                routed = message as RoutedMessage;
                return { ticketId: 't-1' };
            },
        },
    };
};

test('routeCommand forwards the body, correlation id, source, and type', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.use(correlationId());
    app.post('/create', (c) => {
        return routeCommand({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-correlation-id': 'cid-1',
        },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ticketId: 't-1' });

    const command = captured.routed();
    assert.ok(command);
    assert.equal(command.specversion, '1.0');
    assert.equal(command.type, COMMAND_TYPE);
    assert.equal(command.source, SOURCE);
    assert.equal(command.correlationid, 'cid-1');
    assert.deepEqual(command.data, { title: 'Broken printer' });
});

test('routeCommand copies extensions onto the command', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand<Command & { authcontext: { userId: string } }>({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            extensions: { authcontext: { userId: 'user-1' } },
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(captured.routed()?.authcontext, { userId: 'user-1' });
});

test('routeCommand uses mapInputData instead of the JSON body', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            mapInputData: async () => ({ title: 'From the route' }),
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'From the body' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(captured.routed()?.data, { title: 'From the route' });
});

test('routeCommand transformResponse replaces the JSON body', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand<Command, { ticketId: string }>({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            transformResponse: async (result) => ({
                data: { id: result.ticketId },
            }),
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 't-1' });
});

test('routeCommand sets the status code and response headers', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand<Command, { ticketId: string }>({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            transformResponse: (result) => ({
                data: result,
                statusCode: 201,
                headers: { 'x-ticket-id': result.ticketId },
            }),
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get('content-type'), 'application/json');
    assert.equal(response.headers.get('x-ticket-id'), 't-1');
    assert.deepEqual(await response.json(), { ticketId: 't-1' });
});

test('routeCommand uses the Content-Type from transformResponse', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            transformResponse: () => ({
                data: { id: 't-1' },
                headers: { 'Content-Type': 'application/problem+json' },
            }),
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 200);
    assert.equal(
        response.headers.get('content-type'),
        'application/problem+json',
    );
    assert.deepEqual(await response.json(), { id: 't-1' });
});

test('routeCommand returns plain text when Content-Type is text/plain', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            transformResponse: () => ({
                data: 'ticket created',
                headers: { 'Content-Type': 'text/plain' },
            }),
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain');
    assert.equal(await response.text(), 'ticket created');
});

test('routeCommand returns binary data when Content-Type is not JSON', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const captured = captureRouter();
    const app = new Hono();

    app.post('/create', (c) => {
        return routeCommand({
            c,
            router: captured.router,
            type: COMMAND_TYPE,
            source: SOURCE,
            transformResponse: () => ({
                data: png,
                headers: { 'Content-Type': 'image/png' },
            }),
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Broken printer' }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), png);
});

test('routeCommand throws InvalidInputException for invalid JSON', async () => {
    let caught: unknown;
    const app = new Hono();

    app.onError((error, c) => {
        caught = error;
        return handleError(error, c);
    });
    app.post('/create', (c) => {
        return routeCommand({
            c,
            router: { route: async () => ({ ok: true }) },
            type: COMMAND_TYPE,
            source: SOURCE,
        });
    });

    const response = await app.request('/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
    });

    assert.ok(caught instanceof InvalidInputException);
    assert.equal(response.status, 400);

    const body = (await response.json()) as {
        error: string;
        message: string;
        details: { reason: string };
    };
    assert.equal(body.error, 'INVALID_INPUT');
    assert.equal(body.message, 'Invalid input');
    assert.equal(body.details.reason, 'The request body must be a JSON object');
});

test('routeQuery forwards the query string', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.use(correlationId());
    app.get('/list-tickets', (c) => {
        return routeQuery({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
        });
    });

    const response = await app.request('/list-tickets?status=open&offset=0', {
        headers: { 'x-correlation-id': 'cid-2' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ticketId: 't-1' });

    const query = captured.routed();
    assert.ok(query);
    assert.equal(query.specversion, '1.0');
    assert.equal(query.type, QUERY_TYPE);
    assert.equal(query.source, SOURCE);
    assert.equal(query.correlationid, 'cid-2');

    const data = query.data as Record<string, string>;
    assert.equal(data.status, 'open');
    assert.equal(data.offset, '0');
});

test('routeQuery uses mapInputData instead of the query string', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.get('/list-tickets', (c) => {
        return routeQuery({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
            mapInputData: (context) => ({
                status: context.req.query('status'),
                offset: Number(context.req.query('offset')),
            }),
        });
    });

    const response = await app.request('/list-tickets?status=open&offset=5');

    assert.equal(response.status, 200);
    assert.deepEqual(captured.routed()?.data, {
        status: 'open',
        offset: 5,
    });
});

test('routeQuery copies extensions onto the query', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.get('/list-tickets', (c) => {
        return routeQuery<Query & { authcontext: { userId: string } }>({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
            extensions: { authcontext: { userId: 'user-1' } },
        });
    });

    const response = await app.request('/list-tickets?status=open');

    assert.equal(response.status, 200);
    assert.deepEqual(captured.routed()?.authcontext, { userId: 'user-1' });
});

test('routeQuery transformResponse replaces the JSON body', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.get('/list-tickets', (c) => {
        return routeQuery<Query, { ticketId: string }>({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
            transformResponse: async (result) => ({
                data: { id: result.ticketId },
            }),
        });
    });

    const response = await app.request('/list-tickets?status=open');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 't-1' });
});

test('routeQuery sets the status code and response headers', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.get('/list-tickets', (c) => {
        return routeQuery<Query, { ticketId: string }>({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
            transformResponse: (result) => ({
                data: result,
                statusCode: 203,
                headers: { 'x-ticket-id': result.ticketId },
            }),
        });
    });

    const response = await app.request('/list-tickets?status=open');

    assert.equal(response.status, 203);
    assert.equal(response.headers.get('content-type'), 'application/json');
    assert.equal(response.headers.get('x-ticket-id'), 't-1');
    assert.deepEqual(await response.json(), { ticketId: 't-1' });
});

test('routeQuery returns plain text when Content-Type is text/plain', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.get('/list-tickets', (c) => {
        return routeQuery({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
            transformResponse: () => ({
                data: 'open tickets',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            }),
        });
    });

    const response = await app.request('/list-tickets?status=open');

    assert.equal(response.status, 200);
    assert.equal(
        response.headers.get('content-type'),
        'text/plain; charset=utf-8',
    );
    assert.equal(await response.text(), 'open tickets');
});

test('routeQuery uses the Content-Type from transformResponse', async () => {
    const captured = captureRouter();
    const app = new Hono();

    app.get('/list-tickets', (c) => {
        return routeQuery({
            c,
            router: captured.router,
            type: QUERY_TYPE,
            source: SOURCE,
            transformResponse: () => ({
                data: { id: 't-1' },
                headers: { 'content-type': 'application/problem+json' },
            }),
        });
    });

    const response = await app.request('/list-tickets?status=open');

    assert.equal(response.status, 200);
    assert.equal(
        response.headers.get('content-type'),
        'application/problem+json',
    );
    assert.deepEqual(await response.json(), { id: 't-1' });
});

<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus Hono

Adapters and middleware that bridge [Hono](https://hono.dev/) and the Nimbus framework. The package gives your Hono app a correlation ID per request, structured request/response logging with OpenTelemetry tracing, and a single error handler that turns Nimbus exceptions into clean HTTP responses.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

## Install

```bash
# Deno
deno add jsr:@nimbus-cqrs/hono

# NPM
npm install @nimbus-cqrs/hono

# Bun
bun add @nimbus-cqrs/hono
```

`hono` itself is a peer dependency — install it (or use one of the runtimes that ship it via `npm:`/`jsr:` specifiers).

# Examples

For detailed documentation, please refer to the [Nimbus documentation](https://nimbus.overlap.at).

## Quick start

A typical setup wires up all three pieces together: the correlation ID middleware first (so the logger and downstream handlers can read it), the logger second, your routes, and the error handler last.

```typescript
import { Hono } from 'hono';
import { correlationId, handleError, logger } from '@nimbus-cqrs/hono';

const app = new Hono();

app.use(correlationId());
app.use(logger({ enableTracing: true }));

app.get('/hello', (c) => c.json({ hello: 'world' }));

app.onError(handleError);

export default app;
```

## correlationId

`correlationId()` is a Hono middleware that ensures every request carries a stable correlation ID. It reads one from the incoming headers (`x-correlation-id`, `x-request-id` or `request-id`, in that order), or generates a fresh [ULID](https://github.com/ulid/spec) if none is present. The ID is stored on the Hono context and — by default — echoed back in the response as `x-correlation-id`.

```typescript
import { Hono } from 'hono';
import { correlationId, getCorrelationId } from '@nimbus-cqrs/hono';

const app = new Hono();

app.use(correlationId());

app.get('/whoami', (c) => {
    const cid = getCorrelationId(c);
    return c.json({ correlationId: cid });
});
```

Use `getCorrelationId(c)` anywhere you have a Hono context (route handlers, downstream middleware, …) to forward the ID into log entries, outgoing requests, or messages you publish through Nimbus.

You can opt out of the response header or rename it:

```typescript
app.use(correlationId({
    addToResponseHeaders: true,
    responseHeaderName: 'x-trace-id',
}));
```

## logger

`logger()` writes one structured log line when a request comes in and one when it leaves (with the elapsed time), using the Nimbus logger so every entry is automatically tagged with the current correlation ID.

When `enableTracing` is on (default), it also:

-   extracts W3C trace context (`traceparent` / `tracestate`) from incoming headers, so spans created in your handlers stitch into the upstream trace,
-   creates a server span named `HTTP <METHOD> <PATH>` for each request,
-   records `http.method`, `url.path`, `http.target`, `http.status_code` and the correlation ID as span attributes,
-   marks the span as errored on `5xx`/`4xx` responses or thrown exceptions.

```typescript
import { Hono } from 'hono';
import { correlationId, logger } from '@nimbus-cqrs/hono';

const app = new Hono();

app.use(correlationId());
app.use(logger({
    enableTracing: true,
    tracerName: 'api',
}));
```

Set `enableTracing: false` if you only want the request/response log lines and don't run an OpenTelemetry SDK.

## handleError

`handleError` is a drop-in handler for `app.onError(...)`. It maps any `Exception` thrown anywhere in the request pipeline (a Nimbus core exception or one of its subclasses such as `NotFoundException`, `InvalidInputException`, `UnauthorizedException`, `ForbiddenException`, …) to a JSON response using the exception's `statusCode`, `name`, `message` and optional `details`. Anything else falls back to a generic `500 INTERNAL_SERVER_ERROR` and is logged at `critical` level.

```typescript
import { Hono } from 'hono';
import { NotFoundException } from '@nimbus-cqrs/core';
import { handleError } from '@nimbus-cqrs/hono';

const app = new Hono();

app.get('/todos/:id', (c) => {
    throw new NotFoundException('Todo not found', { id: c.req.param('id') });
});

app.onError(handleError);
```

A request to `/todos/42` then responds with HTTP `404` and body:

```json
{
    "error": "NOT_FOUND",
    "message": "Todo not found",
    "details": {
        "id": "42"
    }
}
```

This means your domain code can stay framework-agnostic — throw Nimbus exceptions where they belong (in command/query handlers) and the HTTP layer converts them consistently for you.

# License

Copyright 2024-present Overlap GmbH & Co KG (https://overlap.at)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

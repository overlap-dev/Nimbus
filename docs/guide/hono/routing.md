---
description: Hono route adapters that turn an HTTP request into a Nimbus command or query and return the handler result as JSON.
prev:
    text: "onError Handler"
    link: "/guide/hono/on-error"

next:
    text: "Nimbus EventSourcingDB"
    link: "/guide/eventsourcingdb"
---

# Route Adapter

`routeCommand` and `routeQuery` connect a Hono route handler to a Nimbus message router. A handler should not build CloudEvents messages by hand. The adapter reads the request, fills in the correlation id, and hands a typed message to the router you pass in. The router validates it and calls the registered handler. The same commands stay reachable from a policy or a process manager, which call the router directly and skip HTTP.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Commands

`routeCommand` reads the JSON body as `data`, sets `correlationid` from [`getCorrelationId`](/guide/hono/correlationid), routes the command, and returns the handler result as JSON. The status defaults to `200`.

`source` identifies the system that builds the message. It belongs to your application, as does the router.

```typescript
import { Hono } from "hono";
import { getRouter } from "@nimbus-cqrs/core";
import { correlationId, handleError, routeCommand } from "@nimbus-cqrs/hono";

const app = new Hono();

app.use(correlationId());
app.onError(handleError);

app.post("/invite-user", (c) => {
    return routeCommand<InviteUserCommand, { userId: string }>({
        c,
        router: getRouter('MyCommandRouter'),
        source: "https://nimbus.overlap.at",
        type: INVITE_USER_COMMAND_TYPE,
    });
});
```

A body that is not JSON throws `InvalidInputException`. With [`handleError`](/guide/hono/on-error) registered, that becomes HTTP `400`. Field validation stays on the command schema registered with the Nimbus router.

`mapInputData` builds `data` from the Hono context. Use it when the command needs more than the JSON body, such as a request header.

```typescript
app.post("/invite-user", (c) => {
    return routeCommand<InviteUserCommand, { userId: string }>({
        c,
        router: getRouter('MyCommandRouter'),
        source: "https://nimbus.overlap.at",
        type: INVITE_USER_COMMAND_TYPE,
        mapInputData: async (context) => {
            const body = await context.req.json();

            return {
                ...body,
                idempotencyKey: context.req.header("idempotency-key"),
            };
        },
    });
});
```

When `mapInputData` is set, the adapter does not read the body for you. `routeQuery` accepts the same function, so a query can copy a request header into `data` the same way.

## Queries

`routeQuery` works the same way. The query string is `data` unless you pass `mapInputData`.

```typescript
import { getRouter } from "@nimbus-cqrs/core";
import { routeQuery } from "@nimbus-cqrs/hono";

app.get("/orders", (c) => {
    return routeQuery<GetOrdersQuery, OrdersPage>({
        c,
        router: getRouter('MyQueryRouter'),
        source: "https://nimbus.overlap.at",
        type: GET_ORDERS_QUERY_TYPE,
    });
});
```

A request to `/orders?status=open` produces a query whose `data` is `{ status: "open" }`. Query parameter values arrive as strings. Pass `mapInputData` when the query schema needs another shape, such as numbers, or when a request header belongs in `data`:

```typescript
app.get("/list-tickets", (c) => {
    return routeQuery<ListTicketsQuery, ListTicketsResult>({
        c,
        router: getQueryRouter(),
        source: "https://nimbus.overlap.at",
        type: LIST_TICKETS_QUERY_TYPE,
        mapInputData: (context) => ({
            status: context.req.query("status"),
            offset: Number(context.req.query("offset")),
        }),
    });
});
```

## Extension attributes

Nimbus messages may carry [CloudEvents extension attributes](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md#extension-context-attributes). The adapter does not define any of its own. Pass them through `extensions`. Attribute names must be lowercase ASCII letters or digits.

An application auth context is a good example for such an attribute. Middleware stores it on the Hono context. The route copies it onto the message. Commands and queries then read that attribute. They do not talk to HTTP. Omit `extensions` when the message has no extra attributes.

```typescript
app.post("/create", authentication(), (c) => {
    return routeCommand<CreateTicketCommand, { ticketId: string }>({
        c,
        router: getCommandRouter(),
        source: "https://nimbus.overlap.at",
        type: CREATE_TICKET_COMMAND_TYPE,
        extensions: { authcontext: getAuthContext(c) },
    });
});
```

## Response

The handler result is used for the JSON response body with a `200` status code by default. You can use `transformResponse` to alter the response body, status, or headers. `transformResponse` receives the handler result and returns a custom data object, an optional status, and optional headers.

When `headers` does not include `Content-Type`, the response uses `application/json` and `data` is serialized as JSON. `application/json` and types ending in `+json` are serialized the same way. Any other `Content-Type` sends `data` as the body unchanged, so a string stays plain text and image bytes stay bytes.

```typescript
app.post("/create", (c) => {
    return routeCommand<CreateTicketCommand, { ticketId: string }>({
        c,
        router: getCommandRouter(),
        source: "https://nimbus.overlap.at",
        type: CREATE_TICKET_COMMAND_TYPE,
        transformResponse: (result) => ({
            data: { id: result.ticketId },
            statusCode: 201,
            headers: {
                location: `/tickets/${result.ticketId}`,
                'cache-control': 'no-store',
            },
        }),
    });
});
```

A PNG download sends the bytes with their own content type:

```typescript
transformResponse: (result) => ({
    data: result.pngBytes,
    headers: { "Content-Type": "image/png" },
}),
```

`routeQuery` takes the same option. `mapInputData` and `transformResponse` may be async.
 
---
prev:
    text: "Router"
    link: "/guide/core/router"

next:
    text: "Exceptions"
    link: "/guide/core/exceptions"
---

# Event Bus

The NimbusEventBus enables publish/subscribe messaging for [events](/guide/core/events) within your application. Events are delivered asynchronously to all registered handlers with automatic retry on failure.

::: info Example Application
The examples on this page reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## Setup and Configuration

Configure the event bus at application startup using `setupEventBus()`, then retrieve it anywhere using `getEventBus()`.

```typescript
import { getLogger, setupEventBus } from "@nimbus/core";

setupEventBus("MyEventBus", {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 30000,
    useJitter: true,
    logPublish: (event) => {
        getLogger().debug({
            category: "MyEventBus",
            message: "Published event",
            data: { event },
            ...(event?.correlationid
                ? { correlationId: event.correlationid }
                : {}),
        });
    },
});
```

### Configuration Options

| Option       | Type              | Default | Description                                        |
| ------------ | ----------------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number`          | `2`     | Maximum retry attempts for failed handlers         |
| `baseDelay`  | `number`          | `1000`  | Base delay in milliseconds for exponential backoff |
| `maxDelay`   | `number`          | `30000` | Maximum delay cap in milliseconds                  |
| `useJitter`  | `boolean`         | `true`  | Add randomness to delay to prevent thundering herd |
| `logPublish` | `(event) => void` | -       | Optional callback when an event is published       |

## Subscribing to Events

Subscribe to event types using `subscribeEvent()`:

```typescript
import { getEventBus } from "@nimbus/core";

const eventBus = getEventBus("MyEventBus");

eventBus.subscribeEvent({
    type: "at.overlap.nimbus.user-added",
    handler: async (event: UserAddedEvent) => {
        // Process event and return result
    },
});

eventBus.subscribeEvent({
    type: "at.overlap.nimbus.onboarding-started",
    handler: async (event: OnboardingStartedEvent) => {
        // Process event and return result
    },
    onError: (error, event) => {
        // Handle the error
    },
    options: {
        maxRetries: 0, // Override the default of 2 retries for this subscription
    },
});
```

### Subscription Options

The `subscribeEvent()` method accepts the following options:

| Option    | Type                       | Description                                          |
| --------- | -------------------------- | ---------------------------------------------------- |
| `type`    | `string`                   | The CloudEvents type to subscribe to                 |
| `handler` | `(event) => Promise<void>` | Async handler function for the event                 |
| `onError` | `(error, event) => void`   | Optional callback when all retries are exhausted     |
| `options` | `object`                   | Optional retry options to override EventBus defaults |

## Publishing Events

Publish events using `putEvent()`:

```typescript
import { createEvent, getEventBus } from "@nimbus/core";

const eventBus = getEventBus("default");

const event = createEvent<UserAddedEvent>({
    type: "at.overlap.nimbus.user-added",
    source: "nimbus.overlap.at",
    correlationid: command.correlationid,
    subject: `/users/${user.id}`,
    data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
    },
});

eventBus.putEvent<UserAddedEvent>(event);
```

## Retry Mechanism

When a handler throws an error, the event bus automatically retries using exponential backoff:

1. **First retry**: Waits `baseDelay` ms (default: 1000ms)
2. **Second retry**: Waits `baseDelay * 2` ms (2000ms)
3. **Third retry**: Waits `baseDelay * 4` ms (4000ms)
4. ... continues until `maxDelay` is reached

With `useJitter: true`, a small random amount (up to 10% of the delay) is added to prevent multiple handlers from retrying simultaneously.

After all retries are exhausted, the `onError` callback is invoked (if provided), or the error is logged.

## Event Size Limit

The event bus enforces the CloudEvents specification size limit of 64KB. If you attempt to publish an event larger than this, a `GenericException` is thrown.

## Observability

The event bus is fully instrumented with OpenTelemetry tracing and metrics. See the [Observability](/guide/core/observability) documentation for details.

**Tracing:**

-   `eventbus.publish` span for event publishing
-   `eventbus.handle` span for event handling

**Metrics:**

-   `eventbus_events_published_total` - Counter for published events
-   `eventbus_events_delivered_total` - Counter for delivered events (with success/error status)
-   `eventbus_event_handling_duration_seconds` - Histogram of handler execution time
-   `eventbus_retry_attempts_total` - Counter for retry attempts
-   `eventbus_event_size_bytes` - Histogram of event sizes

---
description: withRetry retries async work with exponential backoff, jitter, AbortSignal support, and hooks for custom retry decisions.
---

# withRetry

The `withRetry` helper retries a promise-returning (or sync) function with exponential backoff until it succeeds, retries are exhausted, or retries are aborted. It is used internally by the [Event Bus](/guide/core/event-bus) and [Event Observer](/guide/eventsourcingdb/event-observer) handler paths, and is available for your own application code.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

```typescript
import { withRetry } from "@nimbus-cqrs/core";

const data = await withRetry(
    async (attempt) => {
        console.log(`Attempt ${attempt}`);

        const response = await fetch("https://api.example.com/resource");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    },
    {
        maxRetries: 3,
        initialDelayMs: 500,
        maxDelayMs: 10_000,
    },
);
```

On exhaustion, `withRetry` rethrows the last error. Total attempts equal `maxRetries + 1`.

## Options

| Option           | Type                                         | Default | Description                                                      |
| ---------------- | -------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `maxRetries`     | `number`                                     | `2`     | Retries after the initial attempt                                |
| `initialDelayMs` | `number`                                     | `1000`  | Base delay before the first retry                                |
| `maxDelayMs`     | `number`                                     | `30000` | Cap for the exponential base delay (before jitter)               |
| `factor`         | `number`                                     | `2`     | Exponential growth factor                                        |
| `jitterFactor`   | `number`                                     | `0.1`   | Fraction of the base delay added as random jitter (`0` disables) |
| `maxRetryTimeMs` | `number`                                     | -       | Optional wall-clock budget for the whole retry sequence          |
| `signal`         | `AbortSignal`                                | -       | Cancel waiting between retries and stop further attempts         |
| `shouldRetry`    | `(context: RetryContext) => boolean`         | -       | Return `false` to stop retrying and rethrow                      |
| `onRetry`        | `(context: RetryContext) => void \| Promise` | -       | Called before each retry delay                                   |

`RetryContext` includes `error`, `attempt` (1-based failed attempt), `retriesLeft`, and `delayMs`.

## Aborting Retries

### From inside the function

Throw `RetryAbortedError` to stop without consuming further retries:

```typescript
import { RetryAbortedError, withRetry } from "@nimbus-cqrs/core";

await withRetry(async () => {
    const response = await fetch(url);
    if (response.status === 404) {
        throw new RetryAbortedError("Resource not found");
    }
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
});
```

### With AbortSignal

```typescript
import { withRetry } from "@nimbus-cqrs/core";

const controller = new AbortController();

const promise = withRetry(() => doWork(), {
    maxRetries: 5,
    signal: controller.signal,
});

// Later, e.g. on shutdown:
controller.abort(new Error("Shutting down"));
```

## Filtering Retriable Errors

```typescript
import { withRetry } from "@nimbus-cqrs/core";

await withRetry(() => callApi(), {
    maxRetries: 5,
    shouldRetry: ({ error }) => !(error.name === "ValidationError"),
    onRetry: ({ attempt, delayMs, error }) => {
        console.warn(`Retry ${attempt} in ${delayMs}ms`, error.message);
    },
});
```

## calculateBackoffDelay

`calculateBackoffDelay` is the shared exponential backoff helper used by `withRetry` and by EventSourcingDB connection reconnects:

```typescript
import { calculateBackoffDelay } from "@nimbus-cqrs/core";

const delayMs = calculateBackoffDelay(1000, 0, {
    maxDelayMs: 30_000,
    jitterFactor: 0.1,
});
```

| Parameter        | Type     | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `initialDelayMs` | `number` | Base delay before exponential scaling           |
| `attempt`        | `number` | Zero-based retry index (`0` = first retry)      |
| `options`        | `object` | Optional `maxDelayMs`, `factor`, `jitterFactor` |

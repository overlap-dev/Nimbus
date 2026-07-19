import {
    assertEquals,
    assertGreaterOrEqual,
    assertLessOrEqual,
    assertRejects,
    assertThrows,
} from '@std/assert';
import {
    calculateBackoffDelay,
    RetryAbortedError,
    withRetry,
} from './withRetry.ts';

// ---------------------------------------------------------------------------
// calculateBackoffDelay
// ---------------------------------------------------------------------------

Deno.test('calculateBackoffDelay returns a value in the expected range for attempt 0', () => {
    const initialDelayMs = 1000;

    for (let i = 0; i < 50; i++) {
        const result = calculateBackoffDelay(initialDelayMs, 0, {
            jitterFactor: 0.1,
        });
        assertGreaterOrEqual(result, 1000);
        assertLessOrEqual(result, 1100);
    }
});

Deno.test('calculateBackoffDelay doubles base delay with each attempt', () => {
    const initialDelayMs = 1000;

    for (let attempt = 0; attempt < 5; attempt++) {
        const baseDelay = initialDelayMs * Math.pow(2, attempt);
        const maxWithJitter = Math.floor(baseDelay * 1.3);

        for (let i = 0; i < 20; i++) {
            const result = calculateBackoffDelay(initialDelayMs, attempt, {
                jitterFactor: 0.3,
            });
            assertGreaterOrEqual(result, baseDelay);
            assertLessOrEqual(result, maxWithJitter);
        }
    }
});

Deno.test('calculateBackoffDelay respects maxDelayMs before jitter', () => {
    for (let i = 0; i < 20; i++) {
        const result = calculateBackoffDelay(1000, 10, {
            maxDelayMs: 5000,
            jitterFactor: 0.1,
        });
        assertGreaterOrEqual(result, 5000);
        assertLessOrEqual(result, 5500);
    }
});

Deno.test('calculateBackoffDelay disables jitter when jitterFactor is 0', () => {
    const result = calculateBackoffDelay(1000, 2, {
        jitterFactor: 0,
    });
    assertEquals(result, 4000);
});

Deno.test('calculateBackoffDelay returns an integer', () => {
    for (let i = 0; i < 20; i++) {
        const result = calculateBackoffDelay(1000, i % 5);
        assertEquals(result, Math.floor(result));
    }
});

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

Deno.test('withRetry returns the result on first success', async () => {
    let calls = 0;

    const result = await withRetry(() => {
        calls++;
        return 'ok';
    }, { maxRetries: 3, initialDelayMs: 1 });

    assertEquals(result, 'ok');
    assertEquals(calls, 1);
});

Deno.test('withRetry retries until success', async () => {
    let calls = 0;

    const result = await withRetry((attempt) => {
        calls++;
        if (attempt < 3) {
            throw new Error(`fail-${attempt}`);
        }
        return 'recovered';
    }, {
        maxRetries: 3,
        initialDelayMs: 1,
        jitterFactor: 0,
    });

    assertEquals(result, 'recovered');
    assertEquals(calls, 3);
});

Deno.test('withRetry throws the last error after exhaustion', async () => {
    let calls = 0;

    await assertRejects(
        () =>
            withRetry(() => {
                calls++;
                throw new Error(`fail-${calls}`);
            }, {
                maxRetries: 2,
                initialDelayMs: 1,
                jitterFactor: 0,
            }),
        Error,
        'fail-3',
    );

    assertEquals(calls, 3);
});

Deno.test('withRetry invokes onRetry before each retry delay', async () => {
    const retries: number[] = [];

    await withRetry((attempt) => {
        if (attempt < 3) {
            throw new Error(`fail-${attempt}`);
        }
        return 'done';
    }, {
        maxRetries: 3,
        initialDelayMs: 10,
        jitterFactor: 0,
        onRetry: ({ attempt, delayMs, retriesLeft }) => {
            retries.push(attempt);
            assertEquals(delayMs, 10 * Math.pow(2, attempt - 1));
            assertEquals(retriesLeft, 3 - (attempt - 1));
        },
    });

    assertEquals(retries, [1, 2]);
});

Deno.test('withRetry stops when shouldRetry returns false', async () => {
    let calls = 0;

    await assertRejects(
        () =>
            withRetry(() => {
                calls++;
                throw new Error('non-retriable');
            }, {
                maxRetries: 5,
                initialDelayMs: 1,
                shouldRetry: () => false,
            }),
        Error,
        'non-retriable',
    );

    assertEquals(calls, 1);
});

Deno.test('withRetry does not retry RetryAbortedError', async () => {
    let calls = 0;

    await assertRejects(
        () =>
            withRetry(() => {
                calls++;
                throw new RetryAbortedError('stop');
            }, {
                maxRetries: 5,
                initialDelayMs: 1,
            }),
        RetryAbortedError,
        'stop',
    );

    assertEquals(calls, 1);
});

Deno.test('withRetry rejects when AbortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));

    await assertRejects(
        () =>
            withRetry(() => 'never', {
                signal: controller.signal,
                maxRetries: 2,
            }),
        Error,
        'cancelled',
    );
});

Deno.test('withRetry aborts while waiting between retries', async () => {
    const controller = new AbortController();
    let calls = 0;

    const promise = withRetry(() => {
        calls++;
        throw new Error('fail');
    }, {
        maxRetries: 5,
        initialDelayMs: 10_000,
        jitterFactor: 0,
        signal: controller.signal,
        onRetry: () => {
            queueMicrotask(() => {
                controller.abort(new Error('aborted-during-delay'));
            });
        },
    });

    await assertRejects(
        () => promise,
        Error,
        'aborted-during-delay',
    );
    assertEquals(calls, 1);
});

Deno.test('withRetry respects maxRetryTimeMs', async () => {
    let calls = 0;
    const started = performance.now();

    await assertRejects(
        () =>
            withRetry(() => {
                calls++;
                throw new Error('slow-fail');
            }, {
                maxRetries: 10,
                initialDelayMs: 50,
                jitterFactor: 0,
                maxRetryTimeMs: 80,
            }),
        Error,
        'slow-fail',
    );

    const elapsed = performance.now() - started;
    assertLessOrEqual(elapsed, 200);
    assertGreaterOrEqual(calls, 1);
    assertLessOrEqual(calls, 4);
});

Deno.test('RetryAbortedError can wrap another error', () => {
    const cause = new Error('not found');
    const aborted = new RetryAbortedError(cause);

    assertEquals(aborted.message, 'not found');
    assertEquals(aborted.cause, cause);
    assertThrows(() => {
        throw aborted;
    }, RetryAbortedError);
});

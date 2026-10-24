import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    calculateBackoffDelay,
    RetryAbortedError,
    withRetry,
} from './withRetry.ts';

// ---------------------------------------------------------------------------
// calculateBackoffDelay
// ---------------------------------------------------------------------------

test('calculateBackoffDelay returns a value in the expected range for attempt 0', () => {
    const initialDelayMs = 1000;

    for (let i = 0; i < 50; i++) {
        const result = calculateBackoffDelay(initialDelayMs, 0, {
            jitterFactor: 0.1,
        });
        assert.ok(result >= 1000);
        assert.ok(result <= 1100);
    }
});

test('calculateBackoffDelay doubles base delay with each attempt', () => {
    const initialDelayMs = 1000;

    for (let attempt = 0; attempt < 5; attempt++) {
        const baseDelay = initialDelayMs * 2 ** attempt;
        const maxWithJitter = Math.floor(baseDelay * 1.3);

        for (let i = 0; i < 20; i++) {
            const result = calculateBackoffDelay(initialDelayMs, attempt, {
                jitterFactor: 0.3,
            });
            assert.ok(result >= baseDelay);
            assert.ok(result <= maxWithJitter);
        }
    }
});

test('calculateBackoffDelay respects maxDelayMs before jitter', () => {
    for (let i = 0; i < 20; i++) {
        const result = calculateBackoffDelay(1000, 10, {
            maxDelayMs: 5000,
            jitterFactor: 0.1,
        });
        assert.ok(result >= 5000);
        assert.ok(result <= 5500);
    }
});

test('calculateBackoffDelay disables jitter when jitterFactor is 0', () => {
    const result = calculateBackoffDelay(1000, 2, {
        jitterFactor: 0,
    });
    assert.deepEqual(result, 4000);
});

test('calculateBackoffDelay returns an integer', () => {
    for (let i = 0; i < 20; i++) {
        const result = calculateBackoffDelay(1000, i % 5);
        assert.deepEqual(result, Math.floor(result));
    }
});

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

test('withRetry returns the result on first success', async () => {
    let calls = 0;

    const result = await withRetry(
        () => {
            calls++;
            return 'ok';
        },
        { maxRetries: 3, initialDelayMs: 1 },
    );

    assert.deepEqual(result, 'ok');
    assert.deepEqual(calls, 1);
});

test('withRetry retries until success', async () => {
    let calls = 0;

    const result = await withRetry(
        (attempt) => {
            calls++;
            if (attempt < 3) {
                throw new Error(`fail-${attempt}`);
            }
            return 'recovered';
        },
        {
            maxRetries: 3,
            initialDelayMs: 1,
            jitterFactor: 0,
        },
    );

    assert.deepEqual(result, 'recovered');
    assert.deepEqual(calls, 3);
});

test('withRetry throws the last error after exhaustion', async () => {
    let calls = 0;

    await assert.rejects(
        () =>
            withRetry(
                () => {
                    calls++;
                    throw new Error(`fail-${calls}`);
                },
                {
                    maxRetries: 2,
                    initialDelayMs: 1,
                    jitterFactor: 0,
                },
            ),
        Error,
        'fail-3',
    );

    assert.deepEqual(calls, 3);
});

test('withRetry invokes onRetry before each retry delay', async () => {
    const retries: number[] = [];

    await withRetry(
        (attempt) => {
            if (attempt < 3) {
                throw new Error(`fail-${attempt}`);
            }
            return 'done';
        },
        {
            maxRetries: 3,
            initialDelayMs: 10,
            jitterFactor: 0,
            onRetry: ({ attempt, delayMs, retriesLeft }) => {
                retries.push(attempt);
                assert.deepEqual(delayMs, 10 * 2 ** (attempt - 1));
                assert.deepEqual(retriesLeft, 3 - (attempt - 1));
            },
        },
    );

    assert.deepEqual(retries, [1, 2]);
});

test('withRetry stops when shouldRetry returns false', async () => {
    let calls = 0;

    await assert.rejects(
        () =>
            withRetry(
                () => {
                    calls++;
                    throw new Error('non-retriable');
                },
                {
                    maxRetries: 5,
                    initialDelayMs: 1,
                    shouldRetry: () => false,
                },
            ),
        Error,
        'non-retriable',
    );

    assert.deepEqual(calls, 1);
});

test('withRetry does not retry RetryAbortedError', async () => {
    let calls = 0;

    await assert.rejects(
        () =>
            withRetry(
                () => {
                    calls++;
                    throw new RetryAbortedError('stop');
                },
                {
                    maxRetries: 5,
                    initialDelayMs: 1,
                },
            ),
        RetryAbortedError,
        'stop',
    );

    assert.deepEqual(calls, 1);
});

test('withRetry rejects when AbortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));

    await assert.rejects(
        () =>
            withRetry(() => 'never', {
                signal: controller.signal,
                maxRetries: 2,
            }),
        { message: /cancelled/ },
    );
});

test('withRetry aborts while waiting between retries', async () => {
    const controller = new AbortController();
    let calls = 0;

    const promise = withRetry(
        () => {
            calls++;
            throw new Error('fail');
        },
        {
            maxRetries: 5,
            initialDelayMs: 10_000,
            jitterFactor: 0,
            signal: controller.signal,
            onRetry: () => {
                queueMicrotask(() => {
                    controller.abort(new Error('aborted-during-delay'));
                });
            },
        },
    );

    await assert.rejects(() => promise, { message: /aborted-during-delay/ });
    assert.deepEqual(calls, 1);
});

test('withRetry respects maxRetryTimeMs', async () => {
    let calls = 0;
    const started = performance.now();

    await assert.rejects(
        () =>
            withRetry(
                () => {
                    calls++;
                    throw new Error('slow-fail');
                },
                {
                    maxRetries: 10,
                    initialDelayMs: 50,
                    jitterFactor: 0,
                    maxRetryTimeMs: 80,
                },
            ),
        Error,
        'slow-fail',
    );

    const elapsed = performance.now() - started;
    assert.ok(elapsed <= 200);
    assert.ok(calls >= 1);
    assert.ok(calls <= 4);
});

test('withRetry stops when remaining maxRetryTimeMs is under 1ms', async () => {
    let calls = 0;
    let now = 0;
    const originalNow = performance.now;
    performance.now = () => now;

    try {
        await assert.rejects(
            () =>
                withRetry(
                    () => {
                        calls++;
                        // Land just under the budget after the first failure so
                        // the next remainingMs is in (0, 1) and would previously
                        // floor to a 0-delay busy-retry loop.
                        if (calls === 1) {
                            now = 79.5;
                        }
                        throw new Error('budget-edge');
                    },
                    {
                        maxRetries: 10,
                        initialDelayMs: 50,
                        jitterFactor: 0,
                        maxRetryTimeMs: 80,
                    },
                ),
            Error,
            'budget-edge',
        );
    } finally {
        performance.now = originalNow;
    }

    assert.deepEqual(calls, 1);
});

test('RetryAbortedError can wrap another error', () => {
    const cause = new Error('not found');
    const aborted = new RetryAbortedError(cause);

    assert.deepEqual(aborted.message, 'not found');
    assert.deepEqual(aborted.cause, cause);
    assert.throws(() => {
        throw aborted;
    }, RetryAbortedError);
});

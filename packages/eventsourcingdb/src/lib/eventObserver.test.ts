import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateBackoffDelay } from './eventObserver.ts';

// ---------------------------------------------------------------------------
// calculateBackoffDelay
// ---------------------------------------------------------------------------

test('calculateBackoffDelay returns a value in the expected range for attempt 0', () => {
    const initialDelayMs = 1000;
    const attempt = 0;

    // baseDelay = 1000 * 2^0 = 1000
    // jitter is between 0 and 30% of baseDelay (0..300)
    // result should be in [1000, 1300]
    for (let i = 0; i < 50; i++) {
        const result = calculateBackoffDelay(initialDelayMs, attempt);
        assert.ok(
            result >= 1000 && result <= 1300,
            `Expected result in [1000, 1300], got ${result}`,
        );
    }
});

test('calculateBackoffDelay doubles base delay with each attempt', () => {
    const initialDelayMs = 1000;

    // Run multiple samples to account for jitter
    for (let attempt = 0; attempt < 5; attempt++) {
        const baseDelay = initialDelayMs * 2 ** attempt;
        const maxWithJitter = Math.floor(baseDelay * 1.3);

        for (let i = 0; i < 20; i++) {
            const result = calculateBackoffDelay(initialDelayMs, attempt);
            assert.ok(
                result >= baseDelay && result <= maxWithJitter,
                `Attempt ${attempt}: expected [${baseDelay}, ${maxWithJitter}], got ${result}`,
            );
        }
    }
});

test('calculateBackoffDelay returns an integer', () => {
    for (let i = 0; i < 20; i++) {
        const result = calculateBackoffDelay(1000, i % 5);
        assert.deepEqual(result, Math.floor(result));
    }
});

test('calculateBackoffDelay handles small initial delay', () => {
    const result = calculateBackoffDelay(1, 0);

    // baseDelay = 1, max jitter = 0.3, floor makes it 1
    assert.ok(result >= 1 && result <= 1, `Expected 1, got ${result}`);
});

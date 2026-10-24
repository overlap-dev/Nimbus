import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    withAsyncGeneratorSpan,
    withObserveEventSpan,
    withSpan,
} from './tracing.ts';

// ---------------------------------------------------------------------------
// withSpan
// ---------------------------------------------------------------------------

test('withSpan returns the result of the wrapped function', async () => {
    const result = await withSpan('testOp', () => Promise.resolve(42));

    assert.deepEqual(result, 42);
});

test('withSpan re-throws errors from the wrapped function', async () => {
    await assert.rejects(
        () => withSpan('testOp', () => Promise.reject(new Error('boom'))),
        { message: /boom/ },
    );
});

test('withSpan accepts an optional traceContext without error', async () => {
    const result = await withSpan('testOp', () => Promise.resolve('traced'), {
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        tracestate: 'vendor=value',
    });

    assert.deepEqual(result, 'traced');
});

// ---------------------------------------------------------------------------
// withAsyncGeneratorSpan
// ---------------------------------------------------------------------------

async function* threeValues() {
    yield 1;
    yield 2;
    yield 3;
}

async function* failingAfterFirst(): AsyncGenerator<number, void, void> {
    yield 1;
    throw new Error('generator failed');
}

test('withAsyncGeneratorSpan yields all values from the inner generator', async () => {
    const values: number[] = [];

    for await (const value of withAsyncGeneratorSpan('testOp', threeValues)) {
        values.push(value);
    }

    assert.deepEqual(values, [1, 2, 3]);
});

test('withAsyncGeneratorSpan re-throws errors from the inner generator', async () => {
    const values: number[] = [];

    await assert.rejects(
        async () => {
            for await (const value of withAsyncGeneratorSpan(
                'testOp',
                failingAfterFirst,
            )) {
                values.push(value);
            }
        },
        Error,
        'generator failed',
    );

    // The value yielded before the error should still have been received
    assert.deepEqual(values, [1]);
});

// ---------------------------------------------------------------------------
// withObserveEventSpan
// ---------------------------------------------------------------------------

const testEvent = {
    id: 'event-1',
    type: 'at.test.nimbus.observed',
    subject: '/test',
};

test('withObserveEventSpan returns the result of the wrapped function', async () => {
    const result = await withObserveEventSpan(
        testEvent,
        '/test',
        undefined,
        () => Promise.resolve(42),
    );

    assert.deepEqual(result, 42);
});

test('withObserveEventSpan re-throws errors from the wrapped function', async () => {
    await assert.rejects(
        () =>
            withObserveEventSpan(testEvent, '/test', undefined, () =>
                Promise.reject(new Error('observe boom')),
            ),
        { message: /observe boom/ },
    );
});

test('withObserveEventSpan accepts an optional TraceContext without error', async () => {
    const result = await withObserveEventSpan(
        testEvent,
        '/test',
        {
            traceparent:
                '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            tracestate: 'vendor=value',
        },
        () => Promise.resolve('observed'),
    );

    assert.deepEqual(result, 'observed');
});

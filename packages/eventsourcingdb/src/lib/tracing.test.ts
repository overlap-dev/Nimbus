import { assertEquals, assertRejects } from '@std/assert';
import { withAsyncGeneratorSpan, withSpan } from './tracing.ts';

// ---------------------------------------------------------------------------
// withSpan
// ---------------------------------------------------------------------------

Deno.test('withSpan returns the result of the wrapped function', async () => {
    const result = await withSpan(
        'testOp',
        () => Promise.resolve(42),
    );

    assertEquals(result, 42);
});

Deno.test('withSpan re-throws errors from the wrapped function', async () => {
    await assertRejects(
        () => withSpan('testOp', () => Promise.reject(new Error('boom'))),
        Error,
        'boom',
    );
});

Deno.test('withSpan accepts an optional traceContext without error', async () => {
    const result = await withSpan(
        'testOp',
        () => Promise.resolve('traced'),
        {
            traceparent:
                '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            tracestate: 'vendor=value',
        },
    );

    assertEquals(result, 'traced');
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

Deno.test('withAsyncGeneratorSpan yields all values from the inner generator', async () => {
    const values: number[] = [];

    for await (const value of withAsyncGeneratorSpan('testOp', threeValues)) {
        values.push(value);
    }

    assertEquals(values, [1, 2, 3]);
});

Deno.test('withAsyncGeneratorSpan re-throws errors from the inner generator', async () => {
    const values: number[] = [];

    await assertRejects(
        async () => {
            for await (
                const value of withAsyncGeneratorSpan(
                    'testOp',
                    failingAfterFirst,
                )
            ) {
                values.push(value);
            }
        },
        Error,
        'generator failed',
    );

    // The value yielded before the error should still have been received
    assertEquals(values, [1]);
});

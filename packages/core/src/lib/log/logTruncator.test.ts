import { assertEquals, assertInstanceOf, assertMatch } from '@std/assert';
import { createLogTruncator } from './logTruncator.ts';

Deno.test('createLogTruncator truncates long message and category', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 10,
        maxCategoryLength: 5,
    });

    const result = truncator({
        message: '0123456789ABCDEF',
        category: 'ABCDEFGHIJ',
        correlationId: 'keep-me',
    });

    assertEquals(result.message, '0123456789…');
    assertEquals(result.category, 'ABCDE…');
    assertEquals(result.correlationId, 'keep-me');
});

Deno.test('createLogTruncator leaves correlationId untouched', () => {
    const longId = 'x'.repeat(1_000);
    const truncator = createLogTruncator({
        maxMessageLength: 5,
        maxCategoryLength: 5,
        maxDataStringLength: 5,
    });

    const result = truncator({
        message: 'short',
        category: 'short',
        correlationId: longId,
        data: { id: longId },
    });

    assertEquals(result.correlationId, longId);
    assertEquals(result.data?.id, `${'x'.repeat(5)}…`);
});

Deno.test('createLogTruncator truncates data strings, arrays, and depth', () => {
    const truncator = createLogTruncator({
        maxDataStringLength: 5,
        maxArrayItems: 2,
        maxDepth: 2,
        maxBytes: 16_384,
    });

    const deep = { a: { b: { c: 'too-deep' } } };
    const result = truncator({
        message: 'ok',
        data: {
            text: '0123456789',
            items: [1, 2, 3, 4],
            nested: deep,
        },
    });

    assertEquals(result.data?.text, '01234…');
    assertEquals(result.data?.items, [
        1,
        2,
        { __truncated: true, omittedCount: 2 },
    ]);
    assertEquals(result.data?.nested, { a: '[Max depth]' });
});

Deno.test('createLogTruncator replaces circular refs in data', () => {
    const truncator = createLogTruncator();
    const circular: Record<string, unknown> = { name: 'root' };
    circular.self = circular;

    const result = truncator({
        message: 'ok',
        data: circular,
    });

    assertEquals(result.data, { name: 'root', self: '[Circular]' });
});

Deno.test('createLogTruncator keeps shared references (not cycles)', () => {
    const truncator = createLogTruncator();
    const shared = { id: 1 };
    const sharedArray = [1, 2];

    const result = truncator({
        message: 'ok',
        data: {
            left: shared,
            right: shared,
            items: sharedArray,
            moreItems: sharedArray,
        },
    });

    assertEquals(result.data, {
        left: { id: 1 },
        right: { id: 1 },
        items: [1, 2],
        moreItems: [1, 2],
    });
});

Deno.test('createLogTruncator clamps maxDepth below 1', () => {
    const truncator = createLogTruncator({ maxDepth: 0 });

    const result = truncator({
        message: 'ok',
        data: { nested: { value: 1 } },
    });

    assertEquals(typeof result.data, 'object');
    assertEquals(result.data, { nested: '[Max depth]' });
});

Deno.test('createLogTruncator replaces oversized data with a size marker', () => {
    const truncator = createLogTruncator({
        maxBytes: 50,
        maxDataStringLength: 10_000,
        maxArrayItems: 1_000,
        maxDepth: 8,
    });

    const result = truncator({
        message: 'ok',
        data: {
            payload: 'x'.repeat(200),
        },
    });

    assertEquals(result.data?.__truncated, true);
    assertEquals(result.data?.reason, 'size');
    assertEquals(result.data?.maxBytes, 50);
    assertEquals(typeof result.data?.serializedByteSize, 'number');
    assertEquals('payload' in (result.data ?? {}), false);
});

Deno.test('createLogTruncator keeps Error shape and truncates message/stack', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 10,
        maxStackLength: 20,
    });

    const error = new Error('0123456789ABCDEF');
    error.stack = 'stack-0123456789ABCDEFGHIJ';

    const result = truncator({
        message: 'log message',
        error,
    });

    assertInstanceOf(result.error, Error);
    assertEquals(result.error?.message, '0123456789…');
    assertEquals(result.error?.stack, 'stack-0123456789ABCD…');
    assertEquals(result.error?.name, 'Error');
});

Deno.test('createLogTruncator walks error.cause up to maxDepth', () => {
    const truncator = createLogTruncator({
        maxDepth: 2,
        maxMessageLength: 100,
        maxStackLength: 500,
    });

    const root = new Error('root');
    const mid = new Error('mid');
    const leaf = new Error('leaf');
    mid.cause = leaf;
    root.cause = mid;

    const result = truncator({
        message: 'ok',
        error: root,
    });

    assertEquals(result.error?.message, 'root');
    assertInstanceOf(result.error?.cause, Error);
    assertEquals((result.error?.cause as Error).message, 'mid');
    assertInstanceOf((result.error?.cause as Error).cause, Error);
    assertEquals(
        ((result.error?.cause as Error).cause as Error).message,
        '[Max depth]',
    );
});

Deno.test('createLogTruncator truncates AggregateError.errors', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 5,
        maxStackLength: 500,
        maxDepth: 8,
    });

    const aggregate = new AggregateError(
        [new Error('0123456789'), new Error('ABCDEFGHIJ')],
        'aggregate-message',
    );

    const result = truncator({
        message: 'ok',
        error: aggregate,
    });

    assertInstanceOf(result.error, AggregateError);
    assertEquals(result.error?.message, 'aggre…');
    const errors = (result.error as AggregateError).errors;
    assertEquals(errors.length, 2);
    assertEquals((errors[0] as Error).message, '01234…');
    assertEquals((errors[1] as Error).message, 'ABCDE…');
});

Deno.test('createLogTruncator uses defaults when options are omitted', () => {
    const truncator = createLogTruncator();
    const result = truncator({
        message: 'x'.repeat(201),
        category: 'y'.repeat(51),
    });

    assertEquals(result.message.length, 201); // 200 + ellipsis
    assertMatch(result.message, /…$/);
    assertEquals(result.category?.length, 51);
    assertMatch(result.category ?? '', /…$/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLogTruncator } from './logTruncator.ts';

test('createLogTruncator truncates long message and category', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 10,
        maxCategoryLength: 5,
    });

    const result = truncator({
        message: '0123456789ABCDEF',
        category: 'ABCDEFGHIJ',
        correlationId: 'keep-me',
    });

    assert.deepEqual(result.message, '0123456789 [... __truncated]');
    assert.deepEqual(result.category, 'ABCDE [... __truncated]');
    assert.deepEqual(result.correlationId, 'keep-me');
});

test('createLogTruncator leaves correlationId untouched', () => {
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

    assert.deepEqual(result.correlationId, longId);
    assert.deepEqual(result.data?.id, `${'x'.repeat(5)} [... __truncated]`);
});

test('createLogTruncator truncates data strings, arrays, and depth', () => {
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

    assert.deepEqual(result.data?.text, '01234 [... __truncated]');
    assert.deepEqual(result.data?.items, [
        1,
        2,
        { __truncated: true, omittedCount: 2 },
    ]);
    assert.deepEqual(result.data?.nested, { a: '[Max depth]' });
});

test('createLogTruncator replaces circular refs in data', () => {
    const truncator = createLogTruncator();
    const circular: Record<string, unknown> = { name: 'root' };
    circular.self = circular;

    const result = truncator({
        message: 'ok',
        data: circular,
    });

    assert.deepEqual(result.data, { name: 'root', self: '[Circular]' });
});

test('createLogTruncator keeps shared references (not cycles)', () => {
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

    assert.deepEqual(result.data, {
        left: { id: 1 },
        right: { id: 1 },
        items: [1, 2],
        moreItems: [1, 2],
    });
});

test('createLogTruncator clamps maxDepth below 1', () => {
    const truncator = createLogTruncator({ maxDepth: 0 });

    const result = truncator({
        message: 'ok',
        data: { nested: { value: 1 } },
    });

    assert.deepEqual(typeof result.data, 'object');
    assert.deepEqual(result.data, { nested: '[Max depth]' });
});

test('createLogTruncator replaces oversized data with a size marker', () => {
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

    assert.deepEqual(result.data?.__truncated, true);
    assert.deepEqual(result.data?.reason, 'size');
    assert.deepEqual(result.data?.maxBytes, 50);
    assert.deepEqual(typeof result.data?.serializedByteSize, 'number');
    assert.deepEqual('payload' in (result.data ?? {}), false);
});

test('createLogTruncator keeps Error shape and truncates message/stack', () => {
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

    assert.ok(result.error instanceof Error);
    assert.deepEqual(result.error?.message, '0123456789 [... __truncated]');
    assert.deepEqual(
        result.error?.stack,
        'stack-0123456789ABCD [... __truncated]',
    );
    assert.deepEqual(result.error?.name, 'Error');
});

test('createLogTruncator walks error.cause up to maxDepth', () => {
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

    assert.deepEqual(result.error?.message, 'root');
    const midCause = result.error?.cause;
    assert.ok(midCause instanceof Error);
    assert.deepEqual(midCause.message, 'mid');
    const leafCause = midCause.cause;
    assert.ok(leafCause instanceof Error);
    assert.deepEqual(leafCause.message, '[Max depth]');
});

test('createLogTruncator truncates AggregateError.errors', () => {
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

    assert.ok(result.error instanceof AggregateError);
    assert.deepEqual(result.error?.message, 'aggre [... __truncated]');
    const errors = (result.error as AggregateError).errors;
    assert.deepEqual(errors.length, 2);
    assert.deepEqual((errors[0] as Error).message, '01234 [... __truncated]');
    assert.deepEqual((errors[1] as Error).message, 'ABCDE [... __truncated]');
});

test('createLogTruncator uses defaults when options are omitted', () => {
    const truncator = createLogTruncator();
    const result = truncator({
        message: 'x'.repeat(201),
        category: 'y'.repeat(51),
    });

    assert.deepEqual(result.message.length, 200 + ' [... __truncated]'.length); // 200 + truncation suffix
    assert.match(result.message, / \[\.\.\. __truncated\]$/);
    assert.deepEqual(result.category?.length, 50 + ' [... __truncated]'.length);
    assert.match(result.category ?? '', / \[\.\.\. __truncated\]$/);
});

test('createLogTruncator converts bigint and replaces unserializable data', () => {
    const truncator = createLogTruncator({ maxBytes: 16_384 });

    const withBigInt = truncator({
        message: 'ok',
        data: { id: 9007199254740993n },
    });

    assert.deepEqual(withBigInt.data, { id: '9007199254740993n' });

    const withThrowingToJSON = truncator({
        message: 'ok',
        data: {
            bad: {
                toJSON() {
                    throw new Error('cannot serialize');
                },
            },
        },
    });

    assert.deepEqual(withThrowingToJSON.data, {
        __truncated: true,
        reason: 'unserializable',
        maxBytes: 16_384,
    });
});

test('createLogTruncator converts Date, Map, Set, and RegExp in data', () => {
    const truncator = createLogTruncator({
        maxArrayItems: 2,
        maxDataStringLength: 500,
    });

    const result = truncator({
        message: 'ok',
        data: {
            at: new Date('2026-07-20T12:00:00.000Z'),
            pattern: /hello/gi,
            map: new Map<string, number>([
                ['a', 1],
                ['b', 2],
                ['c', 3],
            ]),
            set: new Set([1, 2, 3, 4]),
        },
    });

    assert.deepEqual(result.data?.at, '2026-07-20T12:00:00.000Z');
    assert.deepEqual(result.data?.pattern, '/hello/gi');
    assert.deepEqual(result.data?.map, [
        ['a', 1],
        ['b', 2],
        { __truncated: true, omittedCount: 1 },
    ]);
    assert.deepEqual(result.data?.set, [
        1,
        2,
        { __truncated: true, omittedCount: 2 },
    ]);
});

test('createLogTruncator summarizes TypedArrays and ArrayBuffers in data', () => {
    const truncator = createLogTruncator();
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const buffer = bytes.buffer;

    const result = truncator({
        message: 'ok',
        data: {
            bytes,
            buffer,
        },
    });

    assert.deepEqual(result.data?.bytes, {
        __truncated: true,
        reason: 'typedArray',
        type: 'Uint8Array',
        byteLength: 5,
    });
    assert.deepEqual(result.data?.buffer, {
        __truncated: true,
        reason: 'arrayBuffer',
        byteLength: 5,
    });
});

test('createLogTruncator converts Error values inside data to plain objects', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 10,
        maxStackLength: 20,
    });

    const error = new Error('0123456789ABCDEF');
    error.stack = 'stack-0123456789ABCDEFGHIJ';
    (error as Error & { code: string }).code = 'EFAIL';

    const result = truncator({
        message: 'ok',
        data: { err: error },
    });

    assert.deepEqual(result.data?.err, {
        name: 'Error',
        message: '0123456789 [... __truncated]',
        stack: 'stack-0123456789ABCD [... __truncated]',
        code: 'EFAIL',
    });
});

test('createLogTruncator preserves custom enumerable fields on log errors', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 100,
        maxDataStringLength: 5,
    });

    const error = new Error('boom');
    (error as Error & { code: string; detail: string }).code = 'EFAIL';
    (error as Error & { code: string; detail: string }).detail = '0123456789';

    const result = truncator({
        message: 'ok',
        error,
    });

    assert.ok(result.error instanceof Error);
    assert.deepEqual(result.error?.message, 'boom');
    assert.deepEqual((result.error as Error & { code: string }).code, 'EFAIL');
    assert.deepEqual(
        (result.error as Error & { detail: string }).detail,
        '01234 [... __truncated]',
    );
});

test('createLogTruncator truncates non-Error cause and AggregateError items', () => {
    const truncator = createLogTruncator({
        maxMessageLength: 100,
        maxDataStringLength: 5,
        maxArrayItems: 20,
        maxDepth: 8,
    });

    const withCause = new Error('root');
    withCause.cause = { reason: '0123456789', nested: { ok: true } };

    const aggregate = new AggregateError(
        [{ info: 'ABCDEFGHIJ' }, new Error('inner-error')],
        'aggregate',
    );

    const causeResult = truncator({
        message: 'ok',
        error: withCause,
    });

    assert.deepEqual(causeResult.error?.cause, {
        reason: '01234 [... __truncated]',
        nested: { ok: true },
    });

    const aggregateResult = truncator({
        message: 'ok',
        error: aggregate,
    });

    assert.ok(aggregateResult.error instanceof AggregateError);
    const errors = (aggregateResult.error as AggregateError).errors;
    assert.deepEqual(errors[0], { info: 'ABCDE [... __truncated]' });
    assert.ok(errors[1] instanceof Error);
    assert.deepEqual((errors[1] as Error).message, 'inner-error');
});

test('createLogTruncator limits object keys in data', () => {
    const truncator = createLogTruncator({
        maxObjectKeys: 2,
    });

    const result = truncator({
        message: 'ok',
        data: {
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        },
    });

    assert.deepEqual(result.data, {
        a: 1,
        b: 2,
        __truncated: true,
        omittedKeyCount: 2,
    });
});

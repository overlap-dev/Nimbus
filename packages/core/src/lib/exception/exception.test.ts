import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Exception } from './exception.ts';

test('Create new Exception', () => {
    const name = 'TEST_EXCEPTION';
    const message = 'Test exception message';
    const details = { foo: 'bar' };
    const statusCode = 500;

    const exception = new Exception(name, message, details, statusCode);

    assert.ok(exception instanceof Exception);
    assert.deepEqual(exception.name, name);
    assert.deepEqual(exception.message, message);
    assert.deepEqual(exception.statusCode, statusCode);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(typeof exception.stack, 'string');
});

test('Create new Exception from Error', () => {
    const nativeError = new Error('Something unexpected happened!');

    const name = 'TEST_EXCEPTION';
    const message = 'Test exception message';
    const details = { foo: 'bar' };
    const statusCode = 500;

    const exception = new Exception(
        name,
        message,
        details,
        statusCode,
    ).fromError(nativeError);

    assert.ok(exception instanceof Exception);
    assert.deepEqual(exception.name, name);
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, statusCode);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(exception.stack, nativeError.stack);
});

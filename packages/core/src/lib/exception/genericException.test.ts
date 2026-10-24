import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GenericException } from './genericException.ts';

test('GenericException without constructor input', () => {
    const exception = new GenericException();

    assert.ok(exception instanceof GenericException);
    assert.deepEqual(exception.name, 'INTERNAL_SERVER_ERROR');
    assert.deepEqual(exception.message, 'Internal server error');
    assert.deepEqual(exception.statusCode, 500);
    assert.deepEqual(typeof exception.details, 'undefined');
    assert.deepEqual(typeof exception.stack, 'string');
});

test('GenericException with constructor input', () => {
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new GenericException(message, details);

    assert.ok(exception instanceof GenericException);
    assert.deepEqual(exception.name, 'INTERNAL_SERVER_ERROR');
    assert.deepEqual(exception.message, message);
    assert.deepEqual(exception.statusCode, 500);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(typeof exception.stack, 'string');
});

test('GenericException from error without constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');

    const exception = new GenericException().fromError(nativeError);

    assert.ok(exception instanceof GenericException);
    assert.deepEqual(exception.name, 'INTERNAL_SERVER_ERROR');
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, 500);
    assert.deepEqual(typeof exception.details, 'undefined');
    assert.deepEqual(exception.stack, nativeError.stack);
});

test('GenericException from error with constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new GenericException(message, details).fromError(
        nativeError,
    );

    assert.ok(exception instanceof GenericException);
    assert.deepEqual(exception.name, 'INTERNAL_SERVER_ERROR');
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, 500);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(exception.stack, nativeError.stack);
});

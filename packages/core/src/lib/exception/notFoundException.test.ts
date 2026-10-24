import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from './notFoundException.ts';

test('NotFoundException without constructor input', () => {
    const exception = new NotFoundException();

    assert.ok(exception instanceof NotFoundException);
    assert.deepEqual(exception.name, 'NOT_FOUND');
    assert.deepEqual(exception.message, 'Not found');
    assert.deepEqual(exception.statusCode, 404);
    assert.deepEqual(typeof exception.details, 'undefined');
    assert.deepEqual(typeof exception.stack, 'string');
});

test('NotFoundException with constructor input', () => {
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new NotFoundException(message, details);

    assert.ok(exception instanceof NotFoundException);
    assert.deepEqual(exception.name, 'NOT_FOUND');
    assert.deepEqual(exception.message, message);
    assert.deepEqual(exception.statusCode, 404);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(typeof exception.stack, 'string');
});

test('NotFoundException from error without constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');

    const exception = new NotFoundException().fromError(nativeError);

    assert.ok(exception instanceof NotFoundException);
    assert.deepEqual(exception.name, 'NOT_FOUND');
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, 404);
    assert.deepEqual(typeof exception.details, 'undefined');
    assert.deepEqual(exception.stack, nativeError.stack);
});

test('NotFoundException from error with constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new NotFoundException(message, details).fromError(
        nativeError,
    );

    assert.ok(exception instanceof NotFoundException);
    assert.deepEqual(exception.name, 'NOT_FOUND');
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, 404);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(exception.stack, nativeError.stack);
});

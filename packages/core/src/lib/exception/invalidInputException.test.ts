import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvalidInputException } from './invalidInputException.ts';

test('InvalidInputException without constructor input', () => {
    const exception = new InvalidInputException();

    assert.ok(exception instanceof InvalidInputException);
    assert.deepEqual(exception.name, 'INVALID_INPUT');
    assert.deepEqual(exception.message, 'Invalid input');
    assert.deepEqual(exception.statusCode, 400);
    assert.deepEqual(typeof exception.details, 'undefined');
    assert.deepEqual(typeof exception.stack, 'string');
});

test('InvalidInputException with constructor input', () => {
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new InvalidInputException(message, details);

    assert.ok(exception instanceof InvalidInputException);
    assert.deepEqual(exception.name, 'INVALID_INPUT');
    assert.deepEqual(exception.message, message);
    assert.deepEqual(exception.statusCode, 400);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(typeof exception.stack, 'string');
});

test('InvalidInputException from error without constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');

    const exception = new InvalidInputException().fromError(nativeError);

    assert.ok(exception instanceof InvalidInputException);
    assert.deepEqual(exception.name, 'INVALID_INPUT');
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, 400);
    assert.deepEqual(typeof exception.details, 'undefined');
    assert.deepEqual(exception.stack, nativeError.stack);
});

test('InvalidInputException from error with constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new InvalidInputException(message, details).fromError(
        nativeError,
    );

    assert.ok(exception instanceof InvalidInputException);
    assert.deepEqual(exception.name, 'INVALID_INPUT');
    assert.deepEqual(exception.message, nativeError.message);
    assert.deepEqual(exception.statusCode, 400);
    assert.deepEqual(exception.details, details);
    assert.deepEqual(exception.stack, nativeError.stack);
});

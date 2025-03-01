import { assertEquals, assertInstanceOf } from '@std/assert';
import { NotFoundException } from './notFoundException.ts';

Deno.test('NotFoundException without constructor input', () => {
    const exception = new NotFoundException();

    assertInstanceOf(exception, NotFoundException);
    assertEquals(exception.name, 'NOT_FOUND_EXCEPTION');
    assertEquals(exception.message, 'Not found');
    assertEquals(exception.statusCode, 404);
    assertEquals(typeof exception.details, 'undefined');
    assertEquals(typeof exception.stack, 'string');
});

Deno.test('NotFoundException with constructor input', () => {
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new NotFoundException(message, details);

    assertInstanceOf(exception, NotFoundException);
    assertEquals(exception.name, 'NOT_FOUND_EXCEPTION');
    assertEquals(exception.message, message);
    assertEquals(exception.statusCode, 404);
    assertEquals(exception.details, details);
    assertEquals(typeof exception.stack, 'string');
});

Deno.test('NotFoundException from error without constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');

    const exception = new NotFoundException().fromError(nativeError);

    assertInstanceOf(exception, NotFoundException);
    assertEquals(exception.name, 'NOT_FOUND_EXCEPTION');
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, 404);
    assertEquals(typeof exception.details, 'undefined');
    assertEquals(exception.stack, nativeError.stack);
});

Deno.test('NotFoundException from error with constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new NotFoundException(
        message,
        details,
    ).fromError(nativeError);

    assertInstanceOf(exception, NotFoundException);
    assertEquals(exception.name, 'NOT_FOUND_EXCEPTION');
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, 404);
    assertEquals(exception.details, details);
    assertEquals(exception.stack, nativeError.stack);
});

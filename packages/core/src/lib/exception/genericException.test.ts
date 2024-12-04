import { assertEquals, assertInstanceOf } from '@std/assert';
import { GenericException } from './genericException.ts';

Deno.test('GenericException without constructor input', () => {
    const exception = new GenericException();

    assertInstanceOf(exception, GenericException);
    assertEquals(exception.name, 'GENERIC_EXCEPTION');
    assertEquals(exception.message, 'An error occurred');
    assertEquals(exception.statusCode, 500);
    assertEquals(typeof exception.details, 'undefined');
    assertEquals(typeof exception.stack, 'undefined');
});

Deno.test('GenericException with constructor input', () => {
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new GenericException(message, details);

    assertInstanceOf(exception, GenericException);
    assertEquals(exception.name, 'GENERIC_EXCEPTION');
    assertEquals(exception.message, message);
    assertEquals(exception.statusCode, 500);
    assertEquals(exception.details, details);
    assertEquals(typeof exception.stack, 'undefined');
});

Deno.test('GenericException from error without constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');

    const exception = new GenericException().fromError(nativeError);

    assertInstanceOf(exception, GenericException);
    assertEquals(exception.name, 'GENERIC_EXCEPTION');
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, 500);
    assertEquals(typeof exception.details, 'undefined');
    assertEquals(exception.stack, nativeError.stack);
});

Deno.test('GenericException from error with constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new GenericException(
        message,
        details,
    ).fromError(nativeError);

    assertInstanceOf(exception, GenericException);
    assertEquals(exception.name, 'GENERIC_EXCEPTION');
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, 500);
    assertEquals(exception.details, details);
    assertEquals(exception.stack, nativeError.stack);
});

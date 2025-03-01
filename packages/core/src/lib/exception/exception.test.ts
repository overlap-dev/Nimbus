import { assertEquals, assertInstanceOf } from '@std/assert';
import { Exception } from './exception.ts';

Deno.test('Create new Exception', () => {
    const name = 'TEST_EXCEPTION';
    const message = 'Test exception message';
    const details = { foo: 'bar' };
    const statusCode = 500;

    const exception = new Exception(name, message, details, statusCode);

    assertInstanceOf(exception, Exception);
    assertEquals(exception.name, name);
    assertEquals(exception.message, message);
    assertEquals(exception.statusCode, statusCode);
    assertEquals(exception.details, details);
    assertEquals(typeof exception.stack, 'string');
});

Deno.test('Create new Exception from Error', () => {
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

    assertInstanceOf(exception, Exception);
    assertEquals(exception.name, name);
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, statusCode);
    assertEquals(exception.details, details);
    assertEquals(exception.stack, nativeError.stack);
});

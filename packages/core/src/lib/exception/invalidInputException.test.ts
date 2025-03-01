import { assertEquals, assertInstanceOf } from '@std/assert';
import { z } from 'zod';
import { InvalidInputException } from './invalidInputException.ts';

Deno.test('InvalidInputException without constructor input', () => {
    const exception = new InvalidInputException();

    assertInstanceOf(exception, InvalidInputException);
    assertEquals(exception.name, 'INVALID_INPUT_EXCEPTION');
    assertEquals(exception.message, 'The provided input is invalid');
    assertEquals(exception.statusCode, 400);
    assertEquals(typeof exception.details, 'undefined');
    assertEquals(typeof exception.stack, 'string');
});

Deno.test('InvalidInputException with constructor input', () => {
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new InvalidInputException(
        message,
        details,
    );

    assertInstanceOf(exception, InvalidInputException);
    assertEquals(exception.name, 'INVALID_INPUT_EXCEPTION');
    assertEquals(exception.message, message);
    assertEquals(exception.statusCode, 400);
    assertEquals(exception.details, details);
    assertEquals(typeof exception.stack, 'string');
});

Deno.test('InvalidInputException from error without constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');

    const exception = new InvalidInputException().fromError(
        nativeError,
    );

    assertInstanceOf(exception, InvalidInputException);
    assertEquals(exception.name, 'INVALID_INPUT_EXCEPTION');
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, 400);
    assertEquals(typeof exception.details, 'undefined');
    assertEquals(exception.stack, nativeError.stack);
});

Deno.test('InvalidInputException from error with constructor input', () => {
    const nativeError = new Error('Something unexpected happened!');
    const message = 'My custom message';
    const details = {
        foo: 'bar',
    };

    const exception = new InvalidInputException(
        message,
        details,
    ).fromError(nativeError);

    assertInstanceOf(exception, InvalidInputException);
    assertEquals(exception.name, 'INVALID_INPUT_EXCEPTION');
    assertEquals(exception.message, nativeError.message);
    assertEquals(exception.statusCode, 400);
    assertEquals(exception.details, details);
    assertEquals(exception.stack, nativeError.stack);
});

Deno.test('InvalidInputException from ZodError', () => {
    const expectedPayload = z.object({
        foo: z.string(),
    });
    const payload = {
        foo: 123,
    };

    try {
        expectedPayload.parse(payload);
    } catch (error: any) {
        const exception = new InvalidInputException()
            .fromZodError(error);

        assertInstanceOf(exception, InvalidInputException);
        assertEquals(exception.name, 'INVALID_INPUT_EXCEPTION');
        assertEquals(exception.message, 'The provided input is invalid');
        assertEquals(exception.statusCode, 400);
        assertEquals(exception.details, {
            'issues': [
                {
                    'code': 'invalid_type',
                    'expected': 'string',
                    'received': 'number',
                    'path': [
                        'foo',
                    ],
                    'message': 'Expected string, received number',
                },
            ],
        });
        assertEquals(exception.stack, error.stack);
    }
});

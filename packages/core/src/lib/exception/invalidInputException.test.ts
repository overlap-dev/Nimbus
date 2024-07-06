import { z } from 'zod';
import { InvalidInputException } from './invalidInputException';

describe('Exceptions :: InvalidInputException', () => {
    test('InvalidInputException without constructor input', () => {
        const invalidInputException = new InvalidInputException();

        expect(invalidInputException instanceof Error).toBe(false);
        expect(invalidInputException instanceof InvalidInputException).toBe(
            true,
        );
        expect(invalidInputException.name).toBe('INVALID_INPUT_EXCEPTION');
        expect(invalidInputException.message).toBe(
            'The provided input is invalid',
        );
        expect(invalidInputException.statusCode).toBe(400);
        expect(typeof invalidInputException.details).toBe('undefined');
        expect(typeof invalidInputException.stack).toBe('undefined');
    });

    test('InvalidInputException with constructor input', () => {
        const message = 'My custom message';
        const details = {
            foo: 'bar',
        };

        const invalidInputException = new InvalidInputException(
            message,
            details,
        );

        expect(invalidInputException instanceof Error).toBe(false);
        expect(invalidInputException instanceof InvalidInputException).toBe(
            true,
        );
        expect(invalidInputException.name).toBe('INVALID_INPUT_EXCEPTION');
        expect(invalidInputException.message).toBe(message);
        expect(invalidInputException.statusCode).toBe(400);
        expect(invalidInputException.details).toEqual(details);
        expect(typeof invalidInputException.stack).toBe('undefined');
    });

    test('invalidInputException from error without constructor input', () => {
        const nativeError = new Error('Something unexpected happened!');

        const invalidInputException = new InvalidInputException().fromError(
            nativeError,
        );

        expect(invalidInputException instanceof Error).toBe(false);
        expect(invalidInputException instanceof InvalidInputException).toBe(
            true,
        );
        expect(invalidInputException.name).toBe('INVALID_INPUT_EXCEPTION');
        expect(invalidInputException.message).toBe(nativeError.message);
        expect(invalidInputException.statusCode).toBe(400);
        expect(typeof invalidInputException.details).toBe('undefined');
        expect(typeof invalidInputException.stack).toBe('string');
    });

    test('invalidInputException from error with constructor input', () => {
        const nativeError = new Error('Something unexpected happened!');
        const message = 'My custom message';
        const details = {
            foo: 'bar',
        };

        const invalidInputException = new InvalidInputException(
            message,
            details,
        ).fromError(nativeError);

        expect(invalidInputException instanceof Error).toBe(false);
        expect(invalidInputException instanceof InvalidInputException).toBe(
            true,
        );
        expect(invalidInputException.name).toBe('INVALID_INPUT_EXCEPTION');
        expect(invalidInputException.message).toBe(nativeError.message);
        expect(invalidInputException.statusCode).toBe(400);
        expect(invalidInputException.details).toEqual(details);
        expect(typeof invalidInputException.stack).toBe('string');
    });

    test('InvalidInputException from ZodError', () => {
        const expectedPayload = z.object({
            foo: z.string(),
        });
        const payload = {
            foo: 123,
        };

        try {
            expectedPayload.parse(payload);
        } catch (error: any) {
            const invalidInputException =
                new InvalidInputException().fromZodError(error);

            expect(invalidInputException instanceof Error).toBe(false);
            expect(invalidInputException instanceof InvalidInputException).toBe(
                true,
            );
            expect(invalidInputException.name).toBe('INVALID_INPUT_EXCEPTION');
            expect(invalidInputException.statusCode).toBe(400);
            expect(invalidInputException.message).toBe(
                'The provided input is invalid',
            );
            expect(invalidInputException.statusCode).toBe(400);
            expect(typeof invalidInputException.stack).toBe('string');
        }
    });
});

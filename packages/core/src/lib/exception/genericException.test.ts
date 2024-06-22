import { GenericException } from './genericException';

describe('Exceptions :: GenericException', () => {
    test('GenericException without constructor input', () => {
        const genericException = new GenericException();

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof GenericException).toBe(true);
        expect(genericException.name).toBe('GENERIC_EXCEPTION');
        expect(genericException.message).toBe('An error occurred.');
        expect(genericException.statusCode).toBe(500);
        expect(typeof genericException.details).toBe('undefined');
        expect(typeof genericException.stack).toBe('undefined');
    });

    test('GenericException with constructor input', () => {
        const message = 'May custom message.';
        const details = {
            foo: 'bar',
        };

        const genericException = new GenericException(message, details);

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof GenericException).toBe(true);
        expect(genericException.name).toBe('GENERIC_EXCEPTION');
        expect(genericException.message).toBe(message);
        expect(genericException.statusCode).toBe(500);
        expect(genericException.details).toEqual(details);
        expect(typeof genericException.stack).toBe('undefined');
    });

    test('GenericException from error without constructor input', () => {
        const nativeError = new Error('Something unexpected happened!');

        const genericException = new GenericException().fromError(nativeError);

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof GenericException).toBe(true);
        expect(genericException.name).toBe('GENERIC_EXCEPTION');
        expect(genericException.message).toBe(nativeError.message);
        expect(genericException.statusCode).toBe(500);
        expect(typeof genericException.details).toBe('undefined');
        expect(typeof genericException.stack).toBe('string');
    });

    test('GenericException from error with constructor input', () => {
        const nativeError = new Error('Something unexpected happened!');

        const details = {
            foo: 'bar',
        };
        const genericException = new GenericException(
            undefined,
            details,
        ).fromError(nativeError);

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof GenericException).toBe(true);
        expect(genericException.name).toBe('GENERIC_EXCEPTION');
        expect(genericException.message).toBe(nativeError.message);
        expect(genericException.statusCode).toBe(500);
        expect(genericException.details).toEqual(details);
        expect(typeof genericException.stack).toBe('string');
    });
});

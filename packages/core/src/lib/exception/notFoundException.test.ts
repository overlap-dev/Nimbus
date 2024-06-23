import { NotFoundException } from './notFoundException';

describe('Exceptions :: NotFoundException', () => {
    test('NotFoundException without constructor input', () => {
        const notFoundException = new NotFoundException();

        expect(notFoundException instanceof Error).toBe(false);
        expect(notFoundException instanceof NotFoundException).toBe(true);
        expect(notFoundException.name).toBe('NOT_FOUND_EXCEPTION');
        expect(notFoundException.statusCode).toBe(404);
        expect(notFoundException.message).toBe('Not found');
        expect(typeof notFoundException.details).toBe('undefined');
        expect(typeof notFoundException.stack).toBe('undefined');
    });

    test('NotFoundException with constructor input', () => {
        const message = 'My custom message';
        const details = {
            foo: 'bar',
        };

        const genericException = new NotFoundException(message, details);

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof NotFoundException).toBe(true);
        expect(genericException.name).toBe('NOT_FOUND_EXCEPTION');
        expect(genericException.statusCode).toBe(404);
        expect(genericException.message).toBe(message);
        expect(genericException.details).toEqual(details);
        expect(typeof genericException.stack).toBe('undefined');
    });

    test('NotFoundException from error without constructor input', () => {
        const nativeError = new Error('Something unexpected happened!');

        const genericException = new NotFoundException().fromError(nativeError);

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof NotFoundException).toBe(true);
        expect(genericException.name).toBe('NOT_FOUND_EXCEPTION');
        expect(genericException.statusCode).toBe(404);
        expect(genericException.message).toBe(nativeError.message);
        expect(typeof genericException.details).toBe('undefined');
        expect(typeof genericException.stack).toBe('string');
    });

    test('NotFoundException from error with constructor input', () => {
        const nativeError = new Error('Something unexpected happened!');
        const message = 'My custom message';
        const details = {
            foo: 'bar',
        };

        const genericException = new NotFoundException(
            message,
            details,
        ).fromError(nativeError);

        expect(genericException instanceof Error).toBe(false);
        expect(genericException instanceof NotFoundException).toBe(true);
        expect(genericException.name).toBe('NOT_FOUND_EXCEPTION');
        expect(genericException.statusCode).toBe(404);
        expect(genericException.message).toBe(nativeError.message);
        expect(genericException.details).toEqual(details);
        expect(typeof genericException.stack).toBe('string');
    });
});

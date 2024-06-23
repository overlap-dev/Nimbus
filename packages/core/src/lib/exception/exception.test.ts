import { Exception } from './exception';

describe('Exceptions :: Exception', () => {
    test('Create new Exception', () => {
        const name = 'TEST_EXCEPTION';
        const message = 'Test exception message';
        const details = { foo: 'bar' };
        const statusCode = 500;

        const exception = new Exception(name, message, details, statusCode);

        expect(exception instanceof Error).toBe(false);
        expect(exception instanceof Exception).toBe(true);
        expect(exception.name).toBe(name);
        expect(exception.message).toBe(message);
        expect(exception.statusCode).toBe(statusCode);
        expect(exception.details).toEqual(details);
        expect(typeof exception.stack).toBe('undefined');
    });

    test('Exception.fromError()', () => {
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

        expect(exception instanceof Error).toBe(false);
        expect(exception instanceof Exception).toBe(true);
        expect(exception.name).toBe(name);
        expect(exception.message).toBe(nativeError.message);
        expect(exception.statusCode).toBe(statusCode);
        expect(exception.details).toEqual(details);
        expect(exception.stack).toBe(nativeError.stack);
    });
});

import { z } from 'zod';
import { InvalidInputException } from './invalidInputException';

describe('Exceptions :: InvalidInputException', () => {
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
                'The provided input is invalid.',
            );
            expect(invalidInputException.statusCode).toBe(400);
            expect(typeof invalidInputException.stack).toBe('string');
        }
    });
});

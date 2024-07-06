import { z } from 'zod';

export const AuthPolicy = z.object({
    allowAnything: z.boolean(),
});
export type AuthPolicy = z.infer<typeof AuthPolicy>;

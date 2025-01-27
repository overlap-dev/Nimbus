import { z } from 'zod';

export const AuthContext = z.object({
    sub: z.string(),
    groups: z.array(z.string()),
});

export type AuthContext = z.infer<typeof AuthContext>;

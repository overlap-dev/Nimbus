import { z } from 'zod';

export const User = z.object({
    _id: z.string().length(24),
    email: z.email(),
    group: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof User>;

export type UserState = User | null;

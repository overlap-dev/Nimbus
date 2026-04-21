import { z } from 'zod';
import { User } from './user.ts';

export const UserGroup = z.object({
    name: z.string(),
    users: z.array(User),
});

export type UserGroup = z.infer<typeof UserGroup>;

import { z } from 'zod';

export const AccountStatus = z.enum(['active', 'frozen']);
export type AccountStatus = z.infer<typeof AccountStatus>;

export const Account = z.object({
    _id: z.string().length(24),
    name: z.string(),
    status: AccountStatus,
});
export type Account = z.infer<typeof Account>;

import { querySchema } from '@nimbus/core';
import { z } from 'zod';

export const GET_USER_QUERY_TYPE = 'at.overlap.nimbus.get-user';

export const getUserQuerySchema = querySchema.extend({
    type: z.literal(GET_USER_QUERY_TYPE),
    data: z.object({
        id: z.string().length(24),
    }),
});
export type GetUserQuery = z.infer<typeof getUserQuerySchema>;

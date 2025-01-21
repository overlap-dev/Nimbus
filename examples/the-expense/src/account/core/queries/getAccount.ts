import { AuthContext, Query, QueryMetadata } from '@nimbus/core';
import { z } from 'zod';

export const GetAccountQuery = Query(
    z.literal('GET_ACCOUNT'),
    z.object({
        id: z.string().length(24),
    }),
    QueryMetadata(AuthContext),
);
export type GetAccountQuery = z.infer<typeof GetAccountQuery>;

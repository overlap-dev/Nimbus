import { AuthContext, Query, QueryMetadata } from '@nimbus/core';
import { z } from 'zod';

export const ListAccountsQuery = Query(
    z.literal('LIST_ACCOUNTS'),
    z.object({
        limit: z.string().optional(),
        skip: z.string().optional(),
        filter: z.string().optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(['asc', 'desc']).optional(),
    }),
    QueryMetadata(AuthContext),
);
export type ListAccountsQuery = z.infer<typeof ListAccountsQuery>;

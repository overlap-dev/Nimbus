import {
    AuthContext,
    InvalidInputException,
    Query,
    QueryMetadata,
} from '@nimbus/core';
import { z } from 'zod';
import { Account } from '../account.type.ts';

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

export const listAccounts = (
    data: Account[],
    authContext?: AuthContext,
): Account[] => {
    if (!authContext) {
        throw new InvalidInputException();
    }

    return data;
};

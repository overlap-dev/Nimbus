import {
    AuthContext,
    InvalidInputException,
    Query,
    QueryMetadata,
} from '@nimbus/core';
import { z } from 'zod';
import { Account } from '../account.type.ts';

export const GetAccountQuery = Query(
    z.literal('GET_ACCOUNT'),
    z.object({
        id: z.string().length(24),
    }),
    QueryMetadata(AuthContext),
);
export type GetAccountQuery = z.infer<typeof GetAccountQuery>;

export const getAccount = (
    data: Account,
    authContext?: AuthContext,
): Account => {
    if (!authContext) {
        throw new InvalidInputException();
    }

    return data;
};

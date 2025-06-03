import { AuthContext, InvalidInputException, Query } from '@nimbus/core';
import { z } from 'zod';
import { Account } from '../account.type.ts';

export const GetAccountQuery = Query(
    z.literal('account.get'),
    z.object({
        id: z.string().length(24),
    }),
    AuthContext,
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

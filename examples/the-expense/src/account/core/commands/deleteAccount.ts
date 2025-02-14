import {
    AuthContext,
    Command,
    CommandMetadata,
    InvalidInputException,
} from '@nimbus/core';
import { z } from 'zod';
import { Account } from '../account.type.ts';

export const DeleteAccountData = z.object({
    _id: z.string().length(24),
});
export type DeleteAccountData = z.infer<typeof DeleteAccountData>;

export const DeleteAccountCommand = Command(
    z.literal('DELETE_ACCOUNT'),
    DeleteAccountData,
    CommandMetadata(AuthContext),
);
export type DeleteAccountCommand = z.infer<typeof DeleteAccountCommand>;

export const deleteAccount = (
    account: Account,
    authContext?: AuthContext,
): Account => {
    if (!authContext) {
        throw new InvalidInputException();
    }

    return account;
};

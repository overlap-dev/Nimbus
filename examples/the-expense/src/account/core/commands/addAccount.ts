import {
    AuthContext,
    Command,
    CommandMetadata,
    InvalidInputException,
} from '@nimbus/core';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { Account } from '../account.type.ts';

export const AddAccountData = z.object({
    name: z.string(),
});
export type AddAccountData = z.infer<typeof AddAccountData>;

export const AddAccountCommand = Command(
    z.literal('ADD_ACCOUNT'),
    AddAccountData,
    CommandMetadata(AuthContext),
);
export type AddAccountCommand = z.infer<typeof AddAccountCommand>;

export const addAccount = (
    data: AddAccountData,
    authContext?: AuthContext,
): Account => {
    if (!authContext) {
        throw new InvalidInputException();
    }

    return {
        _id: new ObjectId().toString(),
        name: data.name,
        status: 'active',
    };
};

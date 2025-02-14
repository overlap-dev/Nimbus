import { type RouteHandler } from '@nimbus/core';
import { ObjectId } from 'mongodb';
import {
    deleteAccount,
    DeleteAccountCommand,
} from '../../core/commands/deleteAccount.ts';
import { accountRepository } from '../account.repository.ts';

export const deleteAccountHandler: RouteHandler<any> = async (
    command: DeleteAccountCommand,
) => {
    let account = await accountRepository.findOne({
        filter: {
            _id: new ObjectId(command.data._id),
        },
    });

    account = deleteAccount(account, command.metadata.authContext);

    await accountRepository.deleteOne({ item: account });

    return {
        statusCode: 204,
    };
};

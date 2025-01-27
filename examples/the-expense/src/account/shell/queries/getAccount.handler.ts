import { RouteHandler } from '@nimbus/core';
import { ObjectId } from 'mongodb';
import { Account } from '../../core/account.type.ts';
import { getAccount, GetAccountQuery } from '../../core/queries/getAccount.ts';
import { accountRepository } from '../account.repository.ts';

export const getAccountHandler: RouteHandler<
    GetAccountQuery,
    Account
> = async (query) => {
    let account = await accountRepository.findOne({
        filter: { _id: new ObjectId(query.params.id) },
    });

    account = getAccount(account, query.metadata.authContext);

    return {
        statusCode: 200,
        data: account,
    };
};

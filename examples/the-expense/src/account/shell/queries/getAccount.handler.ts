import { InvalidInputException, RouteHandler } from '@nimbus/core';
import { ObjectId } from 'mongodb';
import { Account } from '../../core/account.type.ts';
import { GetAccountQuery } from '../../core/queries/getAccount.ts';
import { accountRepository } from '../account.repository.ts';

export const getAccountHandler: RouteHandler<
    GetAccountQuery,
    Account
> = async (query) => {
    if (!query.metadata.authContext) {
        throw new InvalidInputException();
    }

    const account = await accountRepository.findOne({
        filter: { _id: new ObjectId(query.params.id) },
    });

    return {
        statusCode: 200,
        data: account,
    };
};

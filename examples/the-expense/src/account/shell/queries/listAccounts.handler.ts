import { RouteHandler } from '@nimbus/core';
import { MongoJSON } from '@nimbus/mongodb';
import type { WithPagination } from '../../../shared/withPagination.type.ts';
import { Account } from '../../core/account.type.ts';
import {
    listAccounts,
    ListAccountsQuery,
} from '../../core/queries/listAccounts.ts';
import { accountRepository } from '../account.repository.ts';

export const listAccountsHandler: RouteHandler<
    ListAccountsQuery,
    WithPagination<Account>
> = async (query) => {
    const limit = parseInt(query.params.limit ?? '24');
    const skip = parseInt(query.params.skip ?? '0');
    const filter = MongoJSON.parse(query.params.filter ?? '{}');

    let [accounts, total] = await Promise.all([
        accountRepository.find({
            filter,
            limit,
            skip,
            sort: {
                [query.params.sortBy ?? 'createdAt']: query.params.sortDir ??
                    'asc',
            },
        }),

        accountRepository.countDocuments({
            filter,
        }),
    ]);

    accounts = listAccounts(accounts, query.metadata.authContext);

    return {
        statusCode: 200,
        data: {
            limit,
            skip,
            total,
            items: accounts,
        },
    };
};

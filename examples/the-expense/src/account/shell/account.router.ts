import { NimbusOakRouter } from '@nimbus/oak';
import { AddAccountCommand } from '../core/commands/addAccount.ts';
import { DeleteAccountCommand } from '../core/commands/deleteAccount.ts';
import { GetAccountQuery } from '../core/queries/getAccount.ts';
import { ListAccountsQuery } from '../core/queries/listAccounts.ts';
import { addAccountHandler } from './commands/addAccount.handler.ts';
import { deleteAccountHandler } from './commands/deleteAccount.handler.ts';
import { getAccountHandler } from './queries/getAccount.handler.ts';
import { listAccountsHandler } from './queries/listAccounts.handler.ts';

export const accountRouter = new NimbusOakRouter();

accountRouter.query(
    '/',
    'LIST_ACCOUNTS',
    ListAccountsQuery,
    listAccountsHandler,
);

accountRouter.query(
    '/:id',
    'GET_ACCOUNT',
    GetAccountQuery,
    getAccountHandler,
);

accountRouter.command(
    '/add-account',
    'ADD_ACCOUNT',
    AddAccountCommand,
    addAccountHandler,
);

accountRouter.command(
    '/delete-account',
    'DELETE_ACCOUNT',
    DeleteAccountCommand,
    deleteAccountHandler,
);

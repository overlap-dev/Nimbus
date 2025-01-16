import { NimbusOakRouter } from '@nimbus/oak';
import { AddAccountCommand } from '../core/commands/addAccount.ts';
import { addAccountHandler } from './addAccount.handler.ts';

export const accountRouter = new NimbusOakRouter();

accountRouter.command(
    '/add-account',
    'ADD_ACCOUNT',
    AddAccountCommand,
    addAccountHandler,
);

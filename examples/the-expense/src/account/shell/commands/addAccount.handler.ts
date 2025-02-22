import { InvalidInputException, type RouteHandler } from '@nimbus/core';
import { eventBus } from '../../../eventBus.ts';
import { Account } from '../../core/account.type.ts';
import {
    addAccount,
    AddAccountCommand,
} from '../../core/commands/addAccount.ts';
import { AccountAddedEvent } from '../../core/events/accountAdded.ts';
import { accountRepository } from '../account.repository.ts';

export const addAccountHandler: RouteHandler<any, Account> = async (
    command: AddAccountCommand,
) => {
    let account = addAccount(
        command.data,
        command.metadata.authContext,
    );

    try {
        account = await accountRepository.insertOne({ item: account });
    } catch (error: any) {
        if (error.message.startsWith('E11000')) {
            throw new InvalidInputException(
                'Account already exists',
                {
                    errorCode: 'ACCOUNT_ALREADY_EXISTS',
                    reason: 'An account with the same name already exists',
                },
            );
        }

        throw error;
    }

    eventBus.putEvent<AccountAddedEvent>({
        name: 'ACCOUNT_ADDED',
        data: {
            account: account,
        },
        metadata: {
            correlationId: command.metadata.correlationId,
            authContext: command.metadata.authContext,
        },
    });

    return {
        statusCode: 200,
        data: account,
    };
};

import { InvalidInputException, type RouteHandler } from '@nimbus/core';
import { ulid } from '@std/ulid';
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
        command.data.payload,
        command.data.authContext,
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
        specversion: '1.0',
        id: ulid(),
        source: command.source,
        type: 'account.added',
        data: {
            correlationId: command.data.correlationId,
            payload: {
                account: account,
            },
        },
    });

    return {
        statusCode: 200,
        data: account,
    };
};

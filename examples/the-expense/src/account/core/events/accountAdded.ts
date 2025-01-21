import { AuthContext, Event, EventMetadata } from '@nimbus/core';
import { z } from 'zod';
import { Account } from '../account.type.ts';

export const AccountAddedData = z.object({
    account: Account,
});
export type AccountAddedData = z.infer<
    typeof AccountAddedData
>;

export const AccountAddedEvent = Event(
    z.literal('ACCOUNT_ADDED'),
    AccountAddedData,
    EventMetadata(AuthContext),
);
export type AccountAddedEvent = z.infer<
    typeof AccountAddedEvent
>;

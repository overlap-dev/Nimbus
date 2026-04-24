import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { userRepository } from '../projections/users.repository.ts';

export const LIST_PENDING_USERS_EMAILS_QUERY_TYPE =
    'at.overlap.nimbus.list-pending-users-emails';

export const listPendingUsersEmailsQuerySchema = querySchema.extend({
    type: z.literal(LIST_PENDING_USERS_EMAILS_QUERY_TYPE),
    data: z.object({}),
});
export type ListPendingUsersEmailsQuery = z.infer<
    typeof listPendingUsersEmailsQuerySchema
>;

export const listPendingUsersEmailsQueryHandler = async (
    _query: ListPendingUsersEmailsQuery,
) => {
    const users = await userRepository.find({
        filter: { acceptedAt: null },
        limit: 0,
        skip: 0,
    });

    return users.map((user) => {
        return user.email;
    });
};

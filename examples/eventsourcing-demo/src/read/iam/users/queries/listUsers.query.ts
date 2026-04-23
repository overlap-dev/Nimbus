import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { userRepository } from '../projections/users.repository.ts';

export const LIST_USERS_QUERY_TYPE = 'at.overlap.nimbus.list-users';

export const listUsersQuerySchema = querySchema.extend({
    type: z.literal(LIST_USERS_QUERY_TYPE),
    data: z.object({}),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const listUsersQueryHandler = async (_query: ListUsersQuery) => {
    const users = await userRepository.find({
        filter: {},
        limit: 0,
        skip: 0,
    });

    return users;
};

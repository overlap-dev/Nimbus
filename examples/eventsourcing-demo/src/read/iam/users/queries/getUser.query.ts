import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { userRepository } from '../projections/users.repository.ts';

export const GET_USER_QUERY_TYPE = 'at.overlap.nimbus.get-user';

export const getUserQuerySchema = querySchema.extend({
    type: z.literal(GET_USER_QUERY_TYPE),
    data: z.object({
        id: z.string(),
    }),
});
export type GetUserQuery = z.infer<typeof getUserQuerySchema>;

export const getUserQueryHandler = async (query: GetUserQuery) => {
    const user = await userRepository.findOne({
        filter: { id: query.data.id },
    });

    return user;
};

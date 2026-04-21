import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';

export const LIST_USERS_QUERY_TYPE = 'at.overlap.nimbus.list-users';

export const listUsersQuerySchema = querySchema.extend({
    type: z.literal(LIST_USERS_QUERY_TYPE),
    data: z.object({}),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

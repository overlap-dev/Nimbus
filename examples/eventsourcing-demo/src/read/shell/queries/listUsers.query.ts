import { ListUsersQuery } from '../../core/queries/listUsers.query.ts';
import { usersMemoryStore } from '../memoryStore/usersMemoryStore.ts';

export const listUsersQueryHandler = (_query: ListUsersQuery) => {
    const users = [...usersMemoryStore.values()];

    return users;
};

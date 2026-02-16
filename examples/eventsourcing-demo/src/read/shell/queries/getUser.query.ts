import { NotFoundException } from '@nimbus/core';
import { GetUserQuery } from '../../core/queries/getUser.query.ts';
import { usersMemoryStore } from '../memoryStore/usersMemoryStore.ts';

export const getUserQueryHandler = (query: GetUserQuery) => {
    const user = usersMemoryStore.get(query.data.id);

    if (!user) {
        throw new NotFoundException('User not found', {
            errorCode: 'USER_NOT_FOUND',
            userId: query.data.id,
        });
    }

    return user;
};

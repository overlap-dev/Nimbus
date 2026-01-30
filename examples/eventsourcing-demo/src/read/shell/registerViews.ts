import { getRouter } from '@nimbus/core';
import {
    GET_USER_QUERY_TYPE,
    getUserQuerySchema,
} from '../core/queries/getUser.query.ts';
import {
    LIST_USERS_QUERY_TYPE,
    listUsersQuerySchema,
} from '../core/queries/listUsers.query.ts';
import { getUserQueryHandler } from './queries/getUser.query.ts';
import { listUsersQueryHandler } from './queries/listUsers.query.ts';

export const registerViews = () => {
    const router = getRouter('readRouter');

    router.register(
        GET_USER_QUERY_TYPE,
        getUserQueryHandler,
        getUserQuerySchema,
    );

    router.register(
        LIST_USERS_QUERY_TYPE,
        listUsersQueryHandler,
        listUsersQuerySchema,
    );
};

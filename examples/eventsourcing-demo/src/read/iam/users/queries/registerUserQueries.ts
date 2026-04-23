import { getRouter } from '@nimbus-cqrs/core';
import {
    GET_USER_QUERY_TYPE,
    getUserQueryHandler,
    getUserQuerySchema,
} from './getUser.query.ts';
import {
    LIST_USERS_QUERY_TYPE,
    listUsersQueryHandler,
    listUsersQuerySchema,
} from './listUsers.query.ts';

export const registerUserQueries = () => {
    const router = getRouter('queryRouter');

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

import { getRouter, type MessageRouter, setupRouter } from '@nimbus-cqrs/core';
import { createRouterLoggingOptions } from '../logger.ts';
import { registerTicketingQueries } from './ticketing/query.router.ts';

const QUERY_ROUTER_NAME = 'queryRouter';

export const initQueryRouter = (): void => {
    setupRouter(
        QUERY_ROUTER_NAME,
        createRouterLoggingOptions(QUERY_ROUTER_NAME),
    );

    // Register queries from the different domains.
    registerTicketingQueries();
};

export const getQueryRouter = (): MessageRouter => {
    return getRouter(QUERY_ROUTER_NAME);
};

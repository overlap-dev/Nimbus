import { AsyncLocalStorage } from 'node:async_hooks';
import {
    createLogTruncator,
    getEnv,
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger as setupNimbusLogger,
} from '@nimbus-cqrs/core';
import { isEnvFlagOn } from './api/shared/lib/env.ts';

type MessageWithCorrelationId = {
    correlationid?: string;
};

const routingCorrelationId = new AsyncLocalStorage<string | undefined>();

/**
 * Setup the Nimbus logger.
 *
 * It will be available as `getLogger()` in the rest of the application.
 */
export const setupLogger = () => {
    const env = getEnv({
        variables: ['LOG_LEVEL', 'LOG_FORMAT'],
    });

    const logLevel = parseLogLevel(env.LOG_LEVEL);
    const logFormat = env.LOG_FORMAT;
    const isLogTruncationEnabled = isEnvFlagOn('LOG_TRUNCATION_ENABLED');

    setupNimbusLogger({
        logLevel,
        truncator: isLogTruncationEnabled ? createLogTruncator() : undefined,
        formatter:
            logFormat === 'pretty' ? prettyLogFormatter : jsonLogFormatter,
        useConsoleColors: logFormat === 'pretty',
    });
};

/**
 * Create logging options for a router.
 *
 * It will be used to log the input and output of a router.
 * This ensures the correlation id is propagated through the router.
 *
 * @param routerName - The name of the router.
 * @returns The logging options.
 */
export const createRouterLoggingOptions = (routerName: string) => {
    return {
        logInput: (input: MessageWithCorrelationId) => {
            const correlationId = input.correlationid;
            routingCorrelationId.enterWith(correlationId);

            getLogger().debug({
                category: routerName,
                message: 'Received input',
                data: { input },
                ...(correlationId ? { correlationId } : {}),
            });
        },

        logOutput: (output: unknown) => {
            const correlationId =
                routingCorrelationId.getStore() ??
                (output as MessageWithCorrelationId | undefined)?.correlationid;

            getLogger().debug({
                category: routerName,
                message: 'Output',
                data: { output },
                ...(correlationId ? { correlationId } : {}),
            });
        },
    };
};

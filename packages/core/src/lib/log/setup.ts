import * as log from '@std/log';
import { getLogLevel } from './level.ts';
import { jsonLogHandlerOptions, prettyLogHandlerOptions } from './options.ts';

export type SetupLogInput = {
    logLevel?: string;
    format?: 'pretty' | 'json';
};

/**
 * Sets up basic logging based on the @std/log library.
 *
 * @param {SetupLogInput} input
 * @param {string} input.logLevel - The log level to set for the application.
 * @param {string} input.format - The format can be set to 'pretty' or 'json' and defaults to json. Pretty format is useful for development.
 */
export const setupLog = ({ logLevel, format }: SetupLogInput) => {
    const handlerOptions = format === 'pretty'
        ? prettyLogHandlerOptions
        : jsonLogHandlerOptions;

    log.setup({
        handlers: {
            default: new log.ConsoleHandler(
                getLogLevel(logLevel),
                handlerOptions,
            ),
        },

        loggers: {
            'Nimbus': {
                level: getLogLevel(logLevel),
                handlers: ['default'],
            },
        },
    });
};

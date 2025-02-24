import { defaultLogOptions } from './options.ts';

/**
 * There are different log levels or severity levels that can be used to categorize the log messages.
 *
 * Debug: Detailed information useful for diagnosing problems.
 * Information: General information about the application's operation.
 * Warning: An unexpected event that doesn't prevent the application from functioning.
 * Error: A more severe problem that prevented a specific operation from being completed.
 * Critical: A critical error that causes the application to crash.
 * Silent: No log messages are emitted. This level does not provide a logging function, but it can be used to disable logging.
 */
export type LogLevel =
    | 'debug'
    | 'info'
    | 'warn'
    | 'error'
    | 'critical'
    | 'silent';

/**
 * The numeric representation of the LogLeveL type.
 */
export const numericLogLevel: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    critical: 50,
    silent: 100,
};

/**
 * Parses a log level from a string.
 *
 * @param {string} levelString - The log level as a string
 *
 * @returns {LogLevel} The log level
 */
export const parseLogLevel = (levelString?: string): LogLevel => {
    let logLevel = levelString?.toLowerCase();

    if (!logLevel || !Object.keys(numericLogLevel).includes(logLevel)) {
        console.warn(
            `Invalid log level: ${levelString}, using default log level: ${defaultLogOptions.logLevel}`,
        );

        logLevel = defaultLogOptions.logLevel;
    }

    return logLevel as LogLevel;
};

import { blue, bold, red, yellow } from '@std/fmt/colors';
import type { Exception } from '../exception/exception.ts';
import type { LogFormatter } from './logFormatter.ts';
import { type LogLevel, numericLogLevel } from './logLevel.ts';
import { defaultLogOptions, type LogOptions } from './options.ts';

/**
 * The input for a log message.
 */
export type LogInput = {
    message: string;
    category?: string;
    data?: Record<string, unknown>;
    error?: Error | Exception;
    correlationId?: string;
};

/**
 * A full log record with the log input and additional metadata attached.
 */
export type LogRecord = {
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: Record<string, unknown>;
    error?: Error | Exception;
    correlationId?: string;
};

/**
 * The Logger provides different log methods to
 * log messages at different levels.
 */
export class Logger {
    private static _instance: Logger;

    private readonly _logLevel: LogLevel;
    private readonly _formatter: LogFormatter;
    private readonly _useConsoleColors: boolean;

    constructor(options: LogOptions) {
        this._logLevel = options.logLevel ?? defaultLogOptions.logLevel;
        this._formatter = options.formatter ?? defaultLogOptions.formatter;
        this._useConsoleColors = options.useConsoleColors ??
            defaultLogOptions.useConsoleColors;
    }

    /**
     * Configure the Logger.
     *
     * @param {LogOptions} options - The options for the Logger
     * @param {LogLevel} options.logLevel - The log level to use for the Logger
     * @param {LogFormatter} options.formatter - The formatter to use for the Logger
     */
    public static configure(options: LogOptions): void {
        Logger._instance = new Logger(options);
    }

    /**
     * Get the Logger instance.
     *
     * @returns {Logger} The Logger instance
     */
    public static getInstance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger(defaultLogOptions);
        }

        return Logger._instance;
    }

    /**
     * Log a message at the debug level.
     *
     * @param {LogInput} logInput - The log input
     * @param {string} logInput.message - The message
     * @param {string} logInput.category - An optional category
     * @param {string} logInput.correlationId - An optional correlation ID
     * @param {Record<string, unknown>} logInput.data - An optional data object
     * @param {Error | Exception} logInput.error - An optional error
     *
     * @example
     * ```ts
     * import { getLogger } from "@nimbus/core";
     *
     * getLogger().debug({
     *     message: 'Hello World!',
     *     category: 'MyCategory',
     *     correlationId: '1234567890',
     *     data: {
     *         foo: 'bar',
     *     },
     *     error: new Error('Something went wrong!'),
     * });
     * ```
     */
    public debug(logInput: LogInput): void {
        if (numericLogLevel['debug'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'debug', console.debug);
        }
    }

    /**
     * Log a message at the info level.
     *
     * @param {LogInput} logInput - The log input
     * @param {string} logInput.message - The message
     * @param {string} logInput.category - An optional category
     * @param {string} logInput.correlationId - An optional correlation ID
     * @param {Record<string, unknown>} logInput.data - An optional data object
     * @param {Error | Exception} logInput.error - An optional error
     *
     * @example
     * ```ts
     * import { getLogger } from "@nimbus/core";
     *
     * getLogger().info({
     *     message: 'Hello World!',
     *     category: 'MyCategory',
     *     correlationId: '1234567890',
     *     data: {
     *         foo: 'bar',
     *     },
     *     error: new Error('Something went wrong!'),
     * });
     * ```
     */
    public info(logInput: LogInput): void {
        if (numericLogLevel['info'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'info', console.info);
        }
    }

    /**
     * Log a message at the warn level.
     *
     * @param {LogInput} logInput - The log input
     * @param {string} logInput.message - The message
     * @param {string} logInput.category - An optional category
     * @param {string} logInput.correlationId - An optional correlation ID
     * @param {Record<string, unknown>} logInput.data - An optional data object
     * @param {Error | Exception} logInput.error - An optional error
     *
     * @example
     * ```ts
     * import { getLogger } from "@nimbus/core";
     *
     * getLogger().warn({
     *     message: 'Hello World!',
     *     category: 'MyCategory',
     *     correlationId: '1234567890',
     *     data: {
     *         foo: 'bar',
     *     },
     *     error: new Error('Something went wrong!'),
     * });
     * ```
     */
    public warn(logInput: LogInput): void {
        if (numericLogLevel['warn'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'warn', console.warn);
        }
    }

    /**
     * Log a message at the error level.
     *
     * @param {LogInput} logInput - The log input
     * @param {string} logInput.message - The message
     * @param {string} logInput.category - An optional category
     * @param {string} logInput.correlationId - An optional correlation ID
     * @param {Record<string, unknown>} logInput.data - An optional data object
     * @param {Error | Exception} logInput.error - An optional error
     *
     * @example
     * ```ts
     * import { getLogger } from "@nimbus/core";
     *
     * getLogger().error({
     *     message: 'Hello World!',
     *     category: 'MyCategory',
     *     correlationId: '1234567890',
     *     data: {
     *         foo: 'bar',
     *     },
     *     error: new Error('Something went wrong!'),
     * });
     * ```
     */
    public error(logInput: LogInput): void {
        if (numericLogLevel['error'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'error', console.error);
        }
    }

    /**
     * Log a message at the critical level.
     *
     * @param {LogInput} logInput - The log input
     * @param {string} logInput.message - The message
     * @param {string} logInput.category - An optional category
     * @param {string} logInput.correlationId - An optional correlation ID
     * @param {Record<string, unknown>} logInput.data - An optional data object
     * @param {Error | Exception} logInput.error - An optional error
     *
     * @example
     * ```ts
     * import { getLogger } from "@nimbus/core";
     *
     * getLogger().critical({
     *     message: 'Hello World!',
     *     category: 'MyCategory',
     *     correlationId: '1234567890',
     *     data: {
     *         foo: 'bar',
     *     },
     *     error: new Error('Something went wrong!'),
     * });
     * ```
     */
    public critical(logInput: LogInput): void {
        if (numericLogLevel['critical'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'critical', console.error);
        }
    }

    /**
     * Produce a log record.
     *
     * @param {LogInput} logInput - The log input
     * @param {LogLevel} level - The log level
     *
     * @returns {LogRecord} The log record
     */
    private _produceLogRecord(
        logInput: LogInput,
        level: LogLevel,
    ): LogRecord {
        return {
            timestamp: new Date(),
            level,
            category: logInput.category ?? 'Default',
            message: logInput.message,
            ...(logInput.data && { data: logInput.data }),
            ...(logInput.error && { error: logInput.error }),
            ...(logInput.correlationId &&
                { correlationId: logInput.correlationId }),
        };
    }

    /**
     * Format a log record.
     *
     * @param {LogRecord} logRecord - The log record
     *
     * @returns {string} The formatted log record
     */
    private _formatLogRecord(
        logRecord: LogRecord,
    ): string | string[] {
        return this._formatter(logRecord);
    }

    /**
     * Colorize a string.
     *
     * @param {string} string - The string to colorize
     * @param {LogLevel} logLevel - The log level to determine the color
     *
     * @returns {string} The colorized string
     */
    private _colorizeString(
        string: string,
        logLevel: LogLevel,
    ): string {
        switch (logLevel) {
            case 'info':
                string = blue(string);
                break;
            case 'warn':
                string = yellow(string);
                break;
            case 'error':
                string = red(string);
                break;
            case 'critical':
                string = bold(red(string));
                break;
            default:
                break;
        }

        return string;
    }

    /**
     * Log a message.
     *
     * @param {LogInput} logInput - The log input
     * @param {LogLevel} logLevel - The log level
     * @param {Function} logFunction - The log function
     */
    private _log(
        logInput: LogInput,
        logLevel: LogLevel,
        logFunction: (...data: any[]) => void,
    ): void {
        const logRecord = this._produceLogRecord(logInput, logLevel);
        const formattedLogRecord = this._formatLogRecord(logRecord);

        if (Array.isArray(formattedLogRecord)) {
            if (this._useConsoleColors) {
                const coloredLogs = formattedLogRecord.map((log) =>
                    this._colorizeString(log, logLevel)
                );

                logFunction(...coloredLogs);
            } else {
                logFunction(...formattedLogRecord);
            }
        } else {
            if (this._useConsoleColors) {
                logFunction(this._colorizeString(formattedLogRecord, logLevel));
            } else {
                logFunction(formattedLogRecord);
            }
        }
    }
}

/**
 * Configure the Logger.
 *
 * @param {LogOptions} options - The options for the Logger
 *
 * @example
 * ```ts
 * import {
 *     jsonLogFormatter,
 *     parseLogLevel,
 *     prettyLogFormatter,
 *     setupLogger,
 * } from "@nimbus/core";
 *
 * setupLogger({
 *     logLevel: parseLogLevel(process.env.LOG_LEVEL),
 *     formatter:
 *         process.env.NODE_ENV === "development"
 *             ? prettyLogFormatter
 *             : jsonLogFormatter,
 *     useConsoleColors: process.env.NODE_ENV === "development",
 * });
 * ```
 */
export const setupLogger = (options: LogOptions): void => {
    Logger.configure(options);
};

/**
 * Get the Logger instance.
 *
 * @returns {Logger} The Logger instance
 *
 * @example
 * ```ts
 * import { getLogger } from "@nimbus/core";
 *
 * const logger = getLogger();
 * ```
 */
export const getLogger = (): Logger => {
    return Logger.getInstance();
};

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
};

/**
 * The Logger provides different log methods to
 * log messages at different levels.
 */
export class Logger {
    private static _instance: Logger;

    private _logLevel: LogLevel;
    private _formatter: LogFormatter;
    private _useConsoleColors: boolean;

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
     */
    public debug = (logInput: LogInput) => {
        if (numericLogLevel['debug'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'debug', console.debug);
        }
    };

    /**
     * Log a message at the info level.
     *
     * @param {LogInput} logInput - The log input
     */
    public info = (logInput: LogInput) => {
        if (numericLogLevel['info'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'info', console.info);
        }
    };

    /**
     * Log a message at the warn level.
     *
     * @param {LogInput} logInput - The log input
     */
    public warn = (logInput: LogInput) => {
        if (numericLogLevel['warn'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'warn', console.warn);
        }
    };

    /**
     * Log a message at the error level.
     *
     * @param {LogInput} logInput - The log input
     */
    public error = (logInput: LogInput) => {
        if (numericLogLevel['error'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'error', console.error);
        }
    };

    /**
     * Log a message at the critical level.
     *
     * @param {LogInput} logInput - The log input
     */
    public critical = (logInput: LogInput) => {
        if (numericLogLevel['critical'] >= numericLogLevel[this._logLevel]) {
            this._log(logInput, 'critical', console.error);
        }
    };

    /**
     * Produce a log record.
     *
     * @param {LogInput} logInput - The log input
     * @param {LogLevel} level - The log level
     *
     * @returns {LogRecord} The log record
     */
    private _produceLogRecord = (
        logInput: LogInput,
        level: LogLevel,
    ): LogRecord => {
        return {
            timestamp: new Date(),
            level,
            category: logInput.category ?? 'Default',
            message: logInput.message,
            ...(logInput.data && { data: logInput.data }),
            ...(logInput.error && { error: logInput.error }),
        };
    };

    /**
     * Format a log record.
     *
     * @param {LogRecord} logRecord - The log record
     *
     * @returns {string} The formatted log record
     */
    private _formatLogRecord = (logRecord: LogRecord): string | string[] => {
        return this._formatter(logRecord);
    };

    /**
     * Colorize a string.
     *
     * @param {string} string - The string to colorize
     * @param {LogLevel} logLevel - The log level to determine the color
     *
     * @returns {string} The colorized string
     */
    private _colorizeString = (string: string, logLevel: LogLevel): string => {
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
    };

    /**
     * Log a message.
     *
     * @param {LogInput} logInput - The log input
     * @param {LogLevel} logLevel - The log level
     * @param {Function} logFunction - The log function
     */
    private _log = (
        logInput: LogInput,
        logLevel: LogLevel,
        logFunction: (...data: any[]) => void,
    ) => {
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
    };
}

/**
 * Configure the Logger.
 *
 * @param {LogOptions} options - The options for the Logger
 */
export const setupLogger = (options: LogOptions): void => {
    Logger.configure(options);
};

/**
 * Get the Logger instance.
 *
 * @returns {Logger} The Logger instance
 */
export const getLogger = (): Logger => {
    return Logger.getInstance();
};

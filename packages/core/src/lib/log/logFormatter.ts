import { Exception } from '../exception/exception.ts';
import type { LogRecord } from './logger.ts';

/**
 * Type for a function that formats a log record before outputting it.
 *
 * @param {LogRecord} logRecord - The log record
 *
 * @returns {string} The formatted log record
 */
export type LogFormatter = (logRecord: LogRecord) => string | string[];

/**
 * A formatter that outputs the log record in JSON format.
 *
 * @param {LogRecord} logRecord - The log record
 *
 * @returns {string} The formatted log record
 */
export const jsonLogFormatter: LogFormatter = (
    logRecord: LogRecord,
): string => {
    let processedLogRecord = logRecord;

    if (logRecord.error) {
        // Special handling for Error objects to preserve stack traces
        const processedErrorObj = JSON.parse(
            JSON.stringify(logRecord, (_key, value) => {
                if (value instanceof Error || value instanceof Exception) {
                    return {
                        // Include standard error properties
                        ...value,
                        message: value.message,
                        name: value.name,
                        stack: value.stack,
                    };
                }
                return value;
            }, 2),
        );

        processedLogRecord = {
            ...logRecord,
            error: processedErrorObj,
        };
    }

    return JSON.stringify(processedLogRecord);
};

/**
 * A formatter that outputs the log record in a pretty format.
 *
 * @param {LogRecord} logRecord - The log record
 *
 * @returns {string} The formatted log record
 */
export const prettyLogFormatter: LogFormatter = (
    logRecord: LogRecord,
): string | string[] => {
    let dataString = '';
    let errorString = '';

    if (logRecord.data) {
        dataString = JSON.stringify(logRecord.data, null, 2);
    }

    if (logRecord.error) {
        errorString = JSON.stringify(logRecord.error, null, 2);

        return [
            `[${logRecord.category}] ${logRecord.level.toUpperCase()} :: ${logRecord.message}`,
            errorString.length ? `\n${errorString}` : '',
            logRecord.error.stack ? `\n${logRecord.error.stack}` : '',
            dataString.length ? `\n${dataString}` : '',
        ];
    }

    return `[${logRecord.category}] ${logRecord.level.toUpperCase()} :: ${logRecord.message}${
        dataString.length ? `\n${dataString}` : ''
    }`;
};

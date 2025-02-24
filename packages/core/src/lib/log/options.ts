import { jsonLogFormatter, type LogFormatter } from './logFormatter.ts';
import type { LogLevel } from './logLevel.ts';

/**
 * The options for the Log class.
 */
export type LogOptions = {
    logLevel?: LogLevel;
    formatter?: LogFormatter;
    useConsoleColors?: boolean;
};

/**
 * The default log options.
 */
export const defaultLogOptions: Required<LogOptions> = {
    logLevel: 'silent',
    formatter: jsonLogFormatter,
    useConsoleColors: false,
};

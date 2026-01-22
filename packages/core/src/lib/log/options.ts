import { jsonLogFormatter, type LogFormatter } from './logFormatter.ts';
import type { LogLevel } from './logLevel.ts';

/**
 * Configuration options for the Logger.
 *
 * Use these options with {@link setupLogger} to configure the logger at application startup.
 */
export type LogOptions = {
    /**
     * The minimum log level to output. Messages below this level are silently ignored.
     * Levels in order of severity: debug < info < warn < error < critical.
     * Defaults to 'silent' (no logs output).
     */
    logLevel?: LogLevel;
    /**
     * The formatter function used to convert LogRecord objects into output strings.
     * Use `jsonLogFormatter` for structured JSON output (recommended for production),
     * or `prettyLogFormatter` for human-readable output (recommended for development).
     * Defaults to `jsonLogFormatter`.
     */
    formatter?: LogFormatter;
    /**
     * Whether to apply ANSI color codes to the console output based on log level.
     * Set to true for colored output in development terminals.
     * Set to false for production or when outputting to log aggregation systems.
     * Defaults to false.
     */
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

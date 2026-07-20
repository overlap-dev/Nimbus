import type { LogInput } from './logger.ts';

/**
 * Truncates a {@link LogInput} before it is turned into a log record.
 *
 * Use with {@link setupLogger} via the `truncator` option, or provide a custom
 * implementation. The built-in factory is {@link createLogTruncator}.
 */
export type LogTruncator = (logInput: LogInput) => LogInput;

/**
 * Options for {@link createLogTruncator}.
 *
 * All fields are optional; omitted fields use the built-in defaults.
 */
export type LogTruncatorOptions = {
    /**
     * Maximum serialized byte size of `data` after structural truncation.
     * If still over budget, `data` is replaced with a size marker.
     * Defaults to 16_384 (16 KB).
     */
    maxBytes?: number;
    /**
     * Maximum number of array items kept inside `data`.
     * Defaults to 20.
     */
    maxArrayItems?: number;
    /**
     * Maximum object nesting depth inside `data`, and maximum depth when
     * walking `error.cause` / aggregate error chains.
     * Defaults to 8.
     */
    maxDepth?: number;
    /**
     * Maximum length of `category`.
     * Defaults to 50.
     */
    maxCategoryLength?: number;
    /**
     * Maximum length of `message` and `error.message`.
     * Defaults to 200.
     */
    maxMessageLength?: number;
    /**
     * Maximum length of `error.stack`.
     * Defaults to 500.
     */
    maxStackLength?: number;
    /**
     * Maximum length of string values inside `data`.
     * Defaults to 500.
     */
    maxDataStringLength?: number;
};

const DEFAULT_MAX_BYTES = 16_384;
const DEFAULT_MAX_ARRAY_ITEMS = 20;
const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_CATEGORY_LENGTH = 50;
const DEFAULT_MAX_MESSAGE_LENGTH = 200;
const DEFAULT_MAX_STACK_LENGTH = 500;
const DEFAULT_MAX_DATA_STRING_LENGTH = 500;

type TruncatedArrayMarker = {
    __truncated: true;
    omittedCount: number;
};

type TruncatedSizeMarker = {
    __truncated: true;
    reason: 'size';
    serializedByteSize: number;
    maxBytes: number;
};

const serializedByteSize = (value: unknown): number =>
    new TextEncoder().encode(JSON.stringify(value)).byteLength;

const truncateString = (value: string, maxLength: number): string => {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength)}…`;
};

/**
 * Creates a {@link LogTruncator} that truncates each {@link LogInput} field
 * separately (except `correlationId`, which is left untouched).
 *
 * - `message` / `category`: string length caps
 * - `data`: structural truncation (arrays, strings, depth, circular refs) plus
 *   a byte-size cliff that replaces oversized payloads with a size marker
 * - `error`: stays `Error`-shaped; truncates `message` / `stack` and walks
 *   `cause` / aggregate errors up to `maxDepth`
 *
 * @param options - Optional limits; omitted fields use built-in defaults.
 *
 * @example
 * ```ts
 * import { createLogTruncator, setupLogger } from '@nimbus-cqrs/core';
 *
 * setupLogger({
 *     truncator: createLogTruncator(),
 * });
 *
 * setupLogger({
 *     truncator: createLogTruncator({
 *         maxBytes: 8_192,
 *         maxArrayItems: 20,
 *         maxDepth: 8,
 *         maxCategoryLength: 50,
 *         maxMessageLength: 100,
 *         maxStackLength: 500,
 *         maxDataStringLength: 500,
 *     }),
 * });
 * ```
 */
export const createLogTruncator = (
    options: LogTruncatorOptions = {},
): LogTruncator => {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    const maxArrayItems = options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS;
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const maxCategoryLength = options.maxCategoryLength ??
        DEFAULT_MAX_CATEGORY_LENGTH;
    const maxMessageLength = options.maxMessageLength ??
        DEFAULT_MAX_MESSAGE_LENGTH;
    const maxStackLength = options.maxStackLength ?? DEFAULT_MAX_STACK_LENGTH;
    const maxDataStringLength = options.maxDataStringLength ??
        DEFAULT_MAX_DATA_STRING_LENGTH;

    const truncateDataValue = (
        value: unknown,
        depth: number,
        seen: WeakSet<object>,
    ): unknown => {
        if (value === null || typeof value !== 'object') {
            if (
                typeof value === 'string' &&
                value.length > maxDataStringLength
            ) {
                return truncateString(value, maxDataStringLength);
            }

            return value;
        }

        if (seen.has(value)) {
            return '[Circular]';
        }

        seen.add(value);

        if (depth >= maxDepth) {
            return '[Max depth]';
        }

        if (Array.isArray(value)) {
            if (value.length > maxArrayItems) {
                return [
                    ...value
                        .slice(0, maxArrayItems)
                        .map((item) =>
                            truncateDataValue(item, depth + 1, seen)
                        ),
                    {
                        __truncated: true,
                        omittedCount: value.length - maxArrayItems,
                    } satisfies TruncatedArrayMarker,
                ];
            }

            return value.map((item) =>
                truncateDataValue(item, depth + 1, seen)
            );
        }

        const result: Record<string, unknown> = {};

        for (const [key, entry] of Object.entries(value)) {
            result[key] = truncateDataValue(entry, depth + 1, seen);
        }

        return result;
    };

    const truncateData = (
        data: Record<string, unknown>,
    ): Record<string, unknown> => {
        const truncated = truncateDataValue(data, 0, new WeakSet<object>());
        const byteSize = serializedByteSize(truncated);

        if (byteSize <= maxBytes) {
            return truncated as Record<string, unknown>;
        }

        return {
            __truncated: true,
            reason: 'size',
            serializedByteSize: byteSize,
            maxBytes,
        } satisfies TruncatedSizeMarker;
    };

    const truncateError = (error: Error, depth: number): Error => {
        if (depth >= maxDepth) {
            const maxDepthError = new Error('[Max depth]');
            maxDepthError.name = error.name;
            return maxDepthError;
        }

        const message = truncateString(error.message, maxMessageLength);

        let truncated: Error;

        if (
            typeof AggregateError !== 'undefined' &&
            error instanceof AggregateError
        ) {
            truncated = new AggregateError(
                error.errors.map((item) =>
                    item instanceof Error
                        ? truncateError(item, depth + 1)
                        : item
                ),
                message,
            );
        } else {
            truncated = new Error(message);
        }

        truncated.name = error.name;

        if (typeof error.stack === 'string') {
            truncated.stack = truncateString(error.stack, maxStackLength);
        }

        if ('cause' in error && error.cause !== undefined) {
            truncated.cause = error.cause instanceof Error
                ? truncateError(error.cause, depth + 1)
                : error.cause;
        }

        return truncated;
    };

    return (logInput: LogInput): LogInput => {
        const truncated: LogInput = {
            message: truncateString(logInput.message, maxMessageLength),
        };

        if (logInput.category !== undefined) {
            truncated.category = truncateString(
                logInput.category,
                maxCategoryLength,
            );
        }

        if (logInput.data !== undefined) {
            truncated.data = truncateData(logInput.data);
        }

        if (logInput.error !== undefined) {
            truncated.error = truncateError(logInput.error, 0);
        }

        if (logInput.correlationId !== undefined) {
            truncated.correlationId = logInput.correlationId;
        }

        return truncated;
    };
};

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
     * If still over budget (or not JSON-serializable), `data` is replaced
     * with a size marker. Defaults to 16_384 (16 KB).
     */
    maxBytes?: number;
    /**
     * Maximum number of array items kept inside `data` (also applies when
     * converting `Map` / `Set` to arrays). Defaults to 50.
     */
    maxArrayItems?: number;
    /**
     * Maximum number of own enumerable keys kept on plain objects inside
     * `data`. Defaults to 50.
     */
    maxObjectKeys?: number;
    /**
     * Maximum object nesting depth inside `data`, and maximum depth when
     * walking `error.cause` / aggregate error chains.
     * Defaults to 8. Values below 1 are clamped to 1 so root `data` stays
     * an object.
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
const DEFAULT_MAX_ARRAY_ITEMS = 50;
const DEFAULT_MAX_OBJECT_KEYS = 50;
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
    reason: 'size' | 'unserializable';
    serializedByteSize?: number;
    maxBytes: number;
};

type TruncatedTypedArrayMarker = {
    __truncated: true;
    reason: 'typedArray';
    type: string;
    byteLength: number;
};

type TruncatedArrayBufferMarker = {
    __truncated: true;
    reason: 'arrayBuffer';
    byteLength: number;
};

const serializedByteSize = (value: unknown): number | undefined => {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).byteLength;
    } catch {
        return undefined;
    }
};

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
 * - `data`: structural truncation (arrays, objects, strings, depth, circular
 *   refs, common JS types) plus a byte-size cliff that replaces oversized or
 *   unserializable payloads with a size marker
 * - `error`: stays `Error`-shaped; truncates `message` / `stack`, copies
 *   enumerable custom fields, and walks `cause` / aggregate errors up to
 *   `maxDepth`
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
 *         maxArrayItems: 50,
 *         maxObjectKeys: 50,
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
    // Clamp so root `data` stays an object and string/array limits stay usable.
    const maxBytes = Math.max(
        0,
        options.maxBytes ?? DEFAULT_MAX_BYTES,
    );
    const maxArrayItems = Math.max(
        0,
        options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS,
    );
    const maxObjectKeys = Math.max(
        0,
        options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS,
    );
    const maxDepth = Math.max(
        1,
        options.maxDepth ?? DEFAULT_MAX_DEPTH,
    );
    const maxCategoryLength = Math.max(
        0,
        options.maxCategoryLength ?? DEFAULT_MAX_CATEGORY_LENGTH,
    );
    const maxMessageLength = Math.max(
        0,
        options.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH,
    );
    const maxStackLength = Math.max(
        0,
        options.maxStackLength ?? DEFAULT_MAX_STACK_LENGTH,
    );
    const maxDataStringLength = Math.max(
        0,
        options.maxDataStringLength ?? DEFAULT_MAX_DATA_STRING_LENGTH,
    );

    const truncateDataValue = (
        value: unknown,
        depth: number,
        seen: WeakSet<object>,
    ): unknown => {
        if (typeof value === 'bigint') {
            return truncateString(`${value}n`, maxDataStringLength);
        }

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

        if (depth >= maxDepth) {
            return '[Max depth]';
        }

        seen.add(value);

        try {
            if (value instanceof Date) {
                return truncateString(value.toISOString(), maxDataStringLength);
            }

            if (value instanceof RegExp) {
                return truncateString(value.toString(), maxDataStringLength);
            }

            if (value instanceof ArrayBuffer) {
                return {
                    __truncated: true,
                    reason: 'arrayBuffer',
                    byteLength: value.byteLength,
                } satisfies TruncatedArrayBufferMarker;
            }

            if (ArrayBuffer.isView(value)) {
                return {
                    __truncated: true,
                    reason: 'typedArray',
                    type: value.constructor.name,
                    byteLength: value.byteLength,
                } satisfies TruncatedTypedArrayMarker;
            }

            if (value instanceof Error) {
                return truncateErrorAsData(value, depth, seen);
            }

            if (value instanceof Map) {
                return truncateDataValue(
                    Array.from(value.entries()),
                    depth + 1,
                    seen,
                );
            }

            if (value instanceof Set) {
                return truncateDataValue(
                    Array.from(value.values()),
                    depth + 1,
                    seen,
                );
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

            const entries = Object.entries(value);
            const limited = entries.length > maxObjectKeys
                ? entries.slice(0, maxObjectKeys)
                : entries;

            const result: Record<string, unknown> = {};

            for (const [key, entry] of limited) {
                result[key] = truncateDataValue(entry, depth + 1, seen);
            }

            if (entries.length > maxObjectKeys) {
                result.__truncated = true;
                result.omittedKeyCount = entries.length - maxObjectKeys;
            }

            return result;
        } finally {
            // Recursion stack: allow shared refs, still detect true cycles.
            seen.delete(value);
        }
    };

    const truncateErrorAsData = (
        error: Error,
        depth: number,
        seen: WeakSet<object>,
    ): Record<string, unknown> => {
        const result: Record<string, unknown> = {
            name: error.name,
            message: truncateString(error.message, maxMessageLength),
        };

        if (typeof error.stack === 'string') {
            result.stack = truncateString(error.stack, maxStackLength);
        }

        for (const [key, entry] of Object.entries(error)) {
            if (
                key === 'name' ||
                key === 'message' ||
                key === 'stack' ||
                key === 'cause' ||
                key === 'errors'
            ) {
                continue;
            }

            result[key] = truncateDataValue(entry, depth + 1, seen);
        }

        if ('cause' in error && error.cause !== undefined) {
            result.cause = truncateDataValue(error.cause, depth + 1, seen);
        }

        if (
            typeof AggregateError !== 'undefined' &&
            error instanceof AggregateError
        ) {
            result.errors = truncateDataValue(error.errors, depth + 1, seen);
        }

        return result;
    };

    const truncateData = (
        data: Record<string, unknown>,
    ): Record<string, unknown> => {
        const truncated = truncateDataValue(data, 0, new WeakSet<object>());
        const byteSize = serializedByteSize(truncated);

        if (byteSize !== undefined && byteSize <= maxBytes) {
            return truncated as Record<string, unknown>;
        }

        return {
            __truncated: true,
            reason: byteSize === undefined ? 'unserializable' : 'size',
            ...(byteSize !== undefined ? { serializedByteSize: byteSize } : {}),
            maxBytes,
        } satisfies TruncatedSizeMarker;
    };

    const copyCustomErrorFields = (
        source: Error,
        target: Error,
        depth: number,
    ): void => {
        for (const [key, entry] of Object.entries(source)) {
            if (
                key === 'name' ||
                key === 'message' ||
                key === 'stack' ||
                key === 'cause' ||
                key === 'errors'
            ) {
                continue;
            }

            (target as unknown as Record<string, unknown>)[key] =
                entry instanceof Error
                    ? truncateError(entry, depth + 1)
                    : truncateDataValue(
                        entry,
                        depth + 1,
                        new WeakSet<object>(),
                    );
        }
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
                        : truncateDataValue(
                            item,
                            depth + 1,
                            new WeakSet<object>(),
                        )
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
                : truncateDataValue(
                    error.cause,
                    depth + 1,
                    new WeakSet<object>(),
                );
        }

        copyCustomErrorFields(error, truncated, depth);

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

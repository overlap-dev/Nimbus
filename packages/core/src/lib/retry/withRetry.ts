/**
 * Context passed to {@link WithRetryOptions.shouldRetry} and
 * {@link WithRetryOptions.onRetry} after a failed attempt.
 */
export type RetryContext = {
    /**
     * The error thrown by the failed attempt.
     */
    error: Error;
    /**
     * The 1-based attempt number that failed.
     */
    attempt: number;
    /**
     * How many retries remain after this failure (not counting the
     * attempt that just failed).
     */
    retriesLeft: number;
    /**
     * The delay in milliseconds before the next retry.
     */
    delayMs: number;
};

/**
 * Options for {@link withRetry}.
 */
export type WithRetryOptions = {
    /**
     * Maximum number of retries after the initial attempt.
     * Total attempts = `maxRetries + 1`. Defaults to `2`.
     */
    maxRetries?: number;
    /**
     * Base delay in milliseconds before the first retry. Subsequent
     * retries scale exponentially by {@link factor}. Defaults to `1000`.
     */
    initialDelayMs?: number;
    /**
     * Cap for the exponential backoff delay in milliseconds (applied
     * before jitter). Defaults to `30000`.
     */
    maxDelayMs?: number;
    /**
     * Exponential growth factor. Defaults to `2`.
     */
    factor?: number;
    /**
     * Fraction of the capped base delay added as random jitter
     * (`0` disables jitter). Defaults to `0.1` (up to 10%).
     */
    jitterFactor?: number;
    /**
     * Optional wall-clock budget for the entire retry sequence,
     * measured with `performance.now()`. When exceeded, the last
     * error is thrown without further attempts.
     */
    maxRetryTimeMs?: number;
    /**
     * Abort signal that cancels waiting between retries and prevents
     * further attempts.
     */
    signal?: AbortSignal;
    /**
     * Decide whether a failed attempt should be retried. Returning
     * `false` rejects with the failure error immediately.
     */
    shouldRetry?: (
        context: RetryContext,
    ) => boolean | Promise<boolean>;
    /**
     * Called after a failed attempt when another retry will occur,
     * before waiting for {@link RetryContext.delayMs}.
     */
    onRetry?: (context: RetryContext) => void | Promise<void>;
};

/**
 * Options for {@link calculateBackoffDelay}.
 */
export type CalculateBackoffDelayOptions = {
    /**
     * Cap for the exponential base delay in milliseconds. Defaults to
     * `Infinity` (no cap).
     */
    maxDelayMs?: number;
    /**
     * Exponential growth factor. Defaults to `2`.
     */
    factor?: number;
    /**
     * Fraction of the capped base delay added as random jitter
     * (`0` disables jitter). Defaults to `0.1`.
     */
    jitterFactor?: number;
};

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_INITIAL_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_FACTOR = 2;
const DEFAULT_JITTER_FACTOR = 0.1;

/**
 * Error thrown from inside a {@link withRetry} operation to abort
 * further retries immediately. The promise rejects with this error
 * (or its cause message when constructed from another error).
 *
 * @example
 * ```ts
 * import { RetryAbortedError, withRetry } from '@nimbus-cqrs/core';
 *
 * await withRetry(async () => {
 *     const response = await fetch(url);
 *     if (response.status === 404) {
 *         throw new RetryAbortedError('Resource not found');
 *     }
 *     return response.json();
 * });
 * ```
 */
export class RetryAbortedError extends Error {
    /**
     * Optional underlying error when constructed from an `Error`.
     */
    override readonly cause?: Error;

    constructor(messageOrError?: string | Error) {
        const message = messageOrError instanceof Error
            ? messageOrError.message
            : (messageOrError ?? 'Retry aborted');
        const cause = messageOrError instanceof Error
            ? messageOrError
            : undefined;

        super(message, cause ? { cause } : undefined);
        this.name = 'RetryAbortedError';
        if (cause) {
            this.cause = cause;
        }
    }
}

/**
 * Calculates an exponential backoff delay with optional jitter and
 * max-delay cap for a given retry attempt.
 *
 * @param initialDelayMs - Base delay in milliseconds before exponential
 *   scaling.
 * @param attempt - Zero-based retry attempt number (`0` for the first
 *   retry after the initial failure).
 * @param options - Optional factor, max delay, and jitter settings.
 * @returns The backoff delay in milliseconds (integer).
 *
 * @example
 * ```ts
 * import { calculateBackoffDelay } from '@nimbus-cqrs/core';
 *
 * const delayMs = calculateBackoffDelay(1000, 0, {
 *     maxDelayMs: 30_000,
 *     jitterFactor: 0.1,
 * });
 * ```
 */
export const calculateBackoffDelay = (
    initialDelayMs: number,
    attempt: number,
    options: CalculateBackoffDelayOptions = {},
): number => {
    const factor = options.factor ?? DEFAULT_FACTOR;
    const maxDelayMs = options.maxDelayMs ?? Infinity;
    const jitterFactor = options.jitterFactor ?? DEFAULT_JITTER_FACTOR;

    const baseDelay = Math.min(
        initialDelayMs * Math.pow(factor, attempt),
        maxDelayMs,
    );
    const jitter = jitterFactor > 0
        ? Math.random() * baseDelay * jitterFactor
        : 0;

    return Math.floor(baseDelay + jitter);
};

const toError = (error: unknown): Error =>
    error instanceof Error ? error : new Error(String(error));

const getAbortReason = (signal: AbortSignal): Error => {
    if (signal.reason instanceof Error) {
        return signal.reason;
    }
    if (typeof signal.reason === 'string' && signal.reason.length > 0) {
        return new Error(signal.reason);
    }
    return new DOMException('The operation was aborted.', 'AbortError');
};

/**
 * Returns a promise that resolves after `ms` milliseconds, or rejects
 * early when {@link signal} is aborted.
 */
const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
    if (ms <= 0) {
        if (signal?.aborted) {
            return Promise.reject(getAbortReason(signal));
        }
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(getAbortReason(signal));
            return;
        }

        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);

        const onAbort = () => {
            clearTimeout(timer);
            reject(getAbortReason(signal!));
        };

        signal?.addEventListener('abort', onAbort, { once: true });
    });
};

/**
 * Retries an async (or sync) function with exponential backoff until
 * it succeeds, retries are exhausted, or retries are aborted.
 *
 * On exhaustion the last error is rethrown. Throw
 * {@link RetryAbortedError} inside `fn` to stop retrying immediately.
 * Pass an {@link AbortSignal} to cancel waiting between attempts.
 *
 * @param fn - Function to execute. Receives the 1-based attempt number.
 * @param options - Retry, backoff, and callback options.
 * @returns The fulfilled value of `fn`.
 * @throws The last error after retries are exhausted, a
 *   {@link RetryAbortedError}, or the abort signal reason.
 *
 * @example
 * ```ts
 * import { withRetry } from '@nimbus-cqrs/core';
 *
 * const data = await withRetry(
 *     async (attempt) => {
 *         console.log(`Attempt ${attempt}`);
 *         return await fetch(url).then((r) => r.json());
 *     },
 *     {
 *         maxRetries: 3,
 *         initialDelayMs: 500,
 *         maxDelayMs: 10_000,
 *         onRetry: ({ attempt, delayMs, error }) => {
 *             console.warn(`Retry ${attempt} in ${delayMs}ms`, error);
 *         },
 *     },
 * );
 * ```
 */
export const withRetry = async <T>(
    fn: (attempt: number) => Promise<T> | T,
    options: WithRetryOptions = {},
): Promise<T> => {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    const factor = options.factor ?? DEFAULT_FACTOR;
    const jitterFactor = options.jitterFactor ?? DEFAULT_JITTER_FACTOR;
    const maxRetryTimeMs = options.maxRetryTimeMs;
    const signal = options.signal;

    const startedAt = performance.now();
    let attempt = 0;

    while (true) {
        if (signal?.aborted) {
            throw getAbortReason(signal);
        }

        attempt++;

        try {
            return await fn(attempt);
        } catch (error: unknown) {
            if (error instanceof RetryAbortedError) {
                throw error;
            }

            const err = toError(error);
            const retriesLeft = maxRetries + 1 - attempt;

            if (retriesLeft <= 0) {
                throw err;
            }

            if (
                maxRetryTimeMs !== undefined &&
                performance.now() - startedAt >= maxRetryTimeMs
            ) {
                throw err;
            }

            let delayMs = calculateBackoffDelay(
                initialDelayMs,
                attempt - 1,
                { maxDelayMs, factor, jitterFactor },
            );

            if (maxRetryTimeMs !== undefined) {
                const remainingMs = maxRetryTimeMs -
                    (performance.now() - startedAt);
                // floor() can turn a sub-millisecond remainder into 0.
                // delay(0) is a no-op, so sync failures would otherwise
                // burn through every remaining retry without ever
                // advancing past maxRetryTimeMs.
                if (remainingMs < 1) {
                    throw err;
                }
                delayMs = Math.min(delayMs, Math.floor(remainingMs));
            }

            const context: RetryContext = {
                error: err,
                attempt,
                retriesLeft,
                delayMs,
            };

            if (options.shouldRetry) {
                const shouldRetry = await options.shouldRetry(context);
                if (!shouldRetry) {
                    throw err;
                }
            }

            if (options.onRetry) {
                await options.onRetry(context);
            }

            await delay(delayMs, signal);
        }
    }
};

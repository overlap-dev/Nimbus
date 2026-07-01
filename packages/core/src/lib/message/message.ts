import { getLogger } from '../log/logger.ts';
import type { Command } from './command.ts';
import type { Event } from './event.ts';
import type { Query } from './query.ts';

/**
 * A message is a communication object that can be passed between
 * systems, modules, functions etc.
 *
 * In the Nimbus ecosystem it is either a Command, Event or Query.
 *
 * Nimbus sticks to the CloudEvents specifications for all messages
 * to make it easier to work with these messages across multiple systems.
 *
 * @see https://cloudevents.io/ for more information.
 *
 * @template TData - The type of the data.
 */
export type Message<TData = unknown> =
    | Command<TData>
    | Event<TData>
    | Query<TData>;

/**
 * CloudEvents extension context attribute names must consist of lowercase
 * ASCII letters or digits.
 *
 * @see https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md#extension-context-attributes
 */
const getInvalidExtensionAttributeNames = (
    extensions: Record<string, unknown>,
): string[] => {
    const EXTENSION_ATTRIBUTE_NAME_PATTERN = /^[a-z0-9]+$/;

    return Object.keys(extensions).filter(
        (name) => !EXTENSION_ATTRIBUTE_NAME_PATTERN.test(name),
    );
};

/**
 * Create an error object to capture the stack trace for better debugging.
 */
const createInvalidExtensionAttributeNamesError = (
    invalidNames: string[],
    stackTraceAnchor: (...args: never[]) => unknown,
): Error => {
    const error = new Error(
        `Invalid CloudEvents extension attribute names: ${
            invalidNames.join(', ')
        }`,
    );

    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(error, stackTraceAnchor);
    }

    return error;
};

/**
 * Validates CloudEvents extension attribute names and logs a warning when invalid.
 *
 * Called by {@link createCommand}, {@link createEvent}, and {@link createQuery}
 * to check extension attributes against the CloudEvents naming rules. Invalid
 * names are logged with a stack trace anchored at the caller function.
 *
 * @see https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md#extension-context-attributes
 *
 * @param {Record<string, unknown>} extensions - Extension attributes to validate, excluding known CloudEvents context attributes.
 * @param {string | undefined} correlationId - Optional correlation ID included in the warning log for tracing.
 * @param {(...args: never[]) => unknown} stackTraceAnchor - Function used to anchor the warning stack trace at the message factory caller (for example {@link createCommand}).
 */
export const warnOnInvalidExtensionAttributeNames = (
    extensions: Record<string, unknown>,
    correlationId: string | undefined,
    stackTraceAnchor: (...args: never[]) => unknown,
): void => {
    const invalidNames = getInvalidExtensionAttributeNames(extensions);

    if (invalidNames.length === 0) {
        return;
    }

    getLogger().warn({
        category: 'Nimbus',
        message:
            'Extension attribute names must use lowercase ASCII letters or digits only per CloudEvents specification.',
        data: { invalidAttributeNames: invalidNames },
        error: createInvalidExtensionAttributeNamesError(
            invalidNames,
            stackTraceAnchor,
        ),
        ...(correlationId && { correlationId }),
    });
};

import { GenericException } from '@nimbus-cqrs/core';
import type { EventObserverHandle } from './eventObserver.ts';

/**
 * Registry of the observers started with {@link initEventObserver}.
 */
const eventObserverRegistry = new Map<string, EventObserverHandle>();

/**
 * Registers a started observer under its name.
 *
 * @param handle - The observer handle to register.
 *
 * @throws {GenericException} If an observer with the same name is already registered.
 */
export const registerEventObserver = (handle: EventObserverHandle): void => {
    if (eventObserverRegistry.has(handle.name)) {
        throw new GenericException(
            `An event observer named "${handle.name}" is already running`,
            { observer: handle.name },
        );
    }

    eventObserverRegistry.set(handle.name, handle);
};

/**
 * Get a running event observer by name.
 *
 * @param name - The name the observer was started with.
 * @returns The handle to inspect the observer.
 *
 * @throws {GenericException} If no observer with that name has been started.
 *
 * @example
 * ```ts
 * import { getEventObserver } from '@nimbus-cqrs/eventsourcingdb';
 *
 * const { phase } = getEventObserver('ticketing').status();
 * ```
 */
export const getEventObserver = (name: string): EventObserverHandle => {
    const handle = eventObserverRegistry.get(name);

    if (handle === undefined) {
        throw new GenericException(
            `Event observer "${name}" has not been started. Pass it to setupEventSourcingDBClient({ eventObservers }) or initEventObserver() first.`,
            { observer: name },
        );
    }

    return handle;
};

/**
 * All running event observers, in the order they were started.
 *
 * @example
 * ```ts
 * import { listEventObservers } from '@nimbus-cqrs/eventsourcingdb';
 *
 * const unhealthy = listEventObservers()
 *     .map((observer) => observer.healthCheck())
 *     .filter((health) => health.status !== 'healthy');
 * ```
 */
export const listEventObservers = (): EventObserverHandle[] => {
    return [...eventObserverRegistry.values()];
};

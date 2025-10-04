import type { Event } from '@nimbus/core';
import type { EventStore, EventStoreReadOptions } from './eventStore.ts';

/**
 * Reducer function that applies an event to aggregate state.
 *
 * @template TState - The type of the aggregate state
 */
export type EventReducer<TState> = (
    state: TState,
    event: Event,
) => TState;

/**
 * Options for loading an aggregate.
 */
export type LoadAggregateOptions = EventStoreReadOptions;

/**
 * Result of loading an aggregate from the event store.
 *
 * @template TState - The type of the aggregate state
 */
export type AggregateSnapshot<TState> = {
    state: TState;
    events: Event[];
    version: number;
};

/**
 * Load an aggregate from the event store by replaying events.
 *
 * This function reads all events for a given subject and applies them
 * sequentially using the provided reducer to reconstruct the current state.
 *
 * @param eventStore - The event store to read from
 * @param subject - The subject (aggregate ID) to load
 * @param initialState - The initial state before any events
 * @param reducer - Function to apply events to state
 * @param options - Optional read options (recursive, bounds, etc.)
 *
 * @returns The reconstructed aggregate state with metadata
 *
 * @example
 * ```ts
 * const snapshot = await loadAggregate(
 *   eventStore,
 *   '/recipes/carbonara',
 *   null,
 *   recipeReducer,
 *   { order: 'chronological' }
 * );
 *
 * console.log(snapshot.state);  // Current recipe state
 * console.log(snapshot.version);  // Number of events applied
 * ```
 */
export async function loadAggregate<TState>(
    eventStore: EventStore,
    subject: string,
    initialState: TState,
    reducer: EventReducer<TState>,
    options?: LoadAggregateOptions,
): Promise<AggregateSnapshot<TState>> {
    const events = await eventStore.readEvents(subject, {
        ...options,
        order: 'chronological', // Always apply events in order
    });

    const state = events.reduce(reducer, initialState);

    return {
        state,
        events,
        version: events.length,
    };
}

/**
 * Check if an aggregate exists (has any events).
 *
 * @param eventStore - The event store to check
 * @param subject - The subject (aggregate ID) to check
 *
 * @returns True if the aggregate has events, false otherwise
 */
export async function aggregateExists(
    eventStore: EventStore,
    subject: string,
): Promise<boolean> {
    const events = await eventStore.readEvents(subject, {
        recursive: false,
    });

    return events.length > 0;
}

/**
 * Load multiple aggregates by reading events recursively.
 *
 * This enables dynamic aggregate boundaries - you can read events for
 * a parent subject and reconstruct multiple child aggregates.
 *
 * @param eventStore - The event store to read from
 * @param parentSubject - The parent subject to read recursively
 * @param initialState - The initial state for each aggregate
 * @param reducer - Function to apply events to state
 * @param groupBy - Function to extract subject from event
 *
 * @returns Map of subject to aggregate snapshot
 *
 * @example
 * ```ts
 * // Load all recipes
 * const recipes = await loadAggregates(
 *   eventStore,
 *   '/recipes',
 *   null,
 *   recipeReducer,
 *   (event) => event.subject
 * );
 *
 * for (const [subject, snapshot] of recipes) {
 *   console.log(`${subject}: ${snapshot.state?.name}`);
 * }
 * ```
 */
export async function loadAggregates<TState>(
    eventStore: EventStore,
    parentSubject: string,
    initialState: TState,
    reducer: EventReducer<TState>,
    groupBy: (event: Event) => string,
): Promise<Map<string, AggregateSnapshot<TState>>> {
    const events = await eventStore.readEvents(parentSubject, {
        recursive: true,
        order: 'chronological',
    });

    // Group events by subject
    const eventsBySubject = new Map<string, Event[]>();
    for (const event of events) {
        const subject = groupBy(event);
        if (!eventsBySubject.has(subject)) {
            eventsBySubject.set(subject, []);
        }
        eventsBySubject.get(subject)!.push(event);
    }

    // Reduce each subject's events to build aggregates
    const aggregates = new Map<string, AggregateSnapshot<TState>>();
    for (const [subject, subjectEvents] of eventsBySubject) {
        const state = subjectEvents.reduce(reducer, initialState);
        aggregates.set(subject, {
            state,
            events: subjectEvents,
            version: subjectEvents.length,
        });
    }

    return aggregates;
}

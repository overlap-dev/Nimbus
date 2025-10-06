import type { Event } from '@nimbus/core';

/**
 * Precondition to ensure a subject is on a specific event ID.
 * Enables optimistic concurrency control.
 *
 * @example
 * ```ts
 * {
 *   type: 'isSubjectOnEventId',
 *   payload: {
 *     subject: '/recipes/carbonara',
 *     eventId: '42' // Last known event ID
 *   }
 * }
 * ```
 */
export type IsSubjectOnEventIdPrecondition = {
    type: 'isSubjectOnEventId';
    payload: {
        subject: string;
        eventId: string;
    };
};

/**
 * Precondition to ensure a subject has no existing events.
 * Used when creating a new aggregate to prevent duplicates.
 *
 * @example
 * ```ts
 * {
 *   type: 'isSubjectPristine',
 *   payload: {
 *     subject: '/recipes/carbonara'
 *   }
 * }
 * ```
 */
export type IsSubjectPristinePrecondition = {
    type: 'isSubjectPristine';
    payload: {
        subject: string;
    };
};

/**
 * Sometimes, you want to ensure that an event is only written if a more complex condition holds
 * for example, if no similar event has ever been recorded before.
 * The isEventQlQueryTrue precondition lets you define such conditions using EventQL.
 *
 * @example
 * ```ts
 * {
 *   type: 'isEventQlQueryTrue',
 *   payload: {
 *     query: 'FROM e IN events WHERE e.data.title == "2001 – A Space Odyssey" PROJECT INTO COUNT() == 0'
 * }
 * ```
 */
export type IsEventQlQueryTruePrecondition = {
    type: 'isEventQlQueryTrue';
    payload: {
        query: string;
    };
};

/**
 * Preconditions for writing events.
 * Used for optimistic concurrency control and validation.
 */
export type EventStorePrecondition =
    | IsSubjectOnEventIdPrecondition
    | IsSubjectPristinePrecondition
    | IsEventQlQueryTruePrecondition;

/**
 * Options for writing events.
 */
export type EventStoreWriteOptions = {
    preconditions?: EventStorePrecondition[];
};

export type EventStoreReadOptions = {
    recursive?: boolean;
    order?: 'chronological' | 'antichronological';
    lowerBound?: EventStoreBound;
    upperBound?: EventStoreBound;
    fromLatestEvent?: EventStoreMarker;
};

export type EventStoreBound = {
    id: number;
    type: 'inclusive' | 'exclusive';
};

export type EventStoreMarker = {
    subject: string;
    type: string;
    ifEventIsMissing: 'read-everything' | 'read-nothing';
};

/**
 * Metadata from the event store.
 * Includes the database-assigned event ID for concurrency control.
 */
export type EventStoreMetadata = {
    id: string;
    hash?: string;
    predecessorhash?: string;
    signature?: string | null;
};

/**
 * Event with metadata from the event store.
 */
export type EventWithMetadata = Event & {
    eventstoremetadata: EventStoreMetadata;
};

/**
 * Configuration for observing events from the event store.
 *
 * @example
 * ```ts
 * {
 *   subject: '/recipes',
 *   recursive: true,
 *   sinceEventId: '42',
 *   handler: async (event) => {
 *     console.log('New event:', event);
 *   },
 *   onError: (error, event) => {
 *     console.error('Failed to process event:', error);
 *   }
 * }
 * ```
 */
export type EventStoreObserveConfig = {
    /**
     * The subject to observe events for.
     */
    subject: string;

    /**
     * Whether to observe events recursively for all child subjects.
     * @default false
     */
    recursive?: boolean;

    /**
     * Resume observing from a specific event ID.
     * Useful for checkpointing and recovery after restarts.
     */
    sinceEventId?: string;

    /**
     * Handler called for each new event.
     */
    handler: (event: EventWithMetadata) => Promise<void>;

    /**
     * Error handler called when event processing fails.
     * If not provided, errors will be thrown.
     */
    onError?: (error: Error, event?: EventWithMetadata) => void;
};

/**
 * Status of an event store subscription.
 */
export type EventStoreSubscriptionStatus =
    | 'active'
    | 'paused'
    | 'closed'
    | 'error';

/**
 * Represents an active subscription to events from the event store.
 * Returned by EventStore.observe().
 */
export interface EventStoreSubscription {
    /**
     * Unsubscribe from the event stream and clean up resources.
     */
    unsubscribe(): Promise<void>;

    /**
     * Get the current status of the subscription.
     */
    getStatus(): EventStoreSubscriptionStatus;

    /**
     * Get the last processed event ID.
     * Useful for checkpointing.
     */
    getLastEventId(): string | undefined;
}

/**
 * Event store interface.
 */
export interface EventStore {
    /**
     * Write events to the event store.
     *
     * @param events - Events to write
     * @param options - Write options including preconditions
     * @returns The written events with metadata
     */
    writeEvents: (
        events: Event[],
        options?: EventStoreWriteOptions,
    ) => Promise<EventWithMetadata[]>;

    /**
     * Read events from the event store.
     *
     * @param subject - The subject to read events for
     * @param options - Read options (recursive, order, bounds, etc.)
     * @returns Array of events matching the criteria with metadata
     */
    readEvents: (
        subject: string,
        options?: EventStoreReadOptions,
    ) => Promise<EventWithMetadata[]>;

    /**
     * Observe events from the event store in real-time.
     *
     * Creates a subscription that calls the handler for each new event.
     * The implementation may use SSE, WebSockets, polling, or other mechanisms.
     *
     * @param config - Configuration for observing events
     * @returns A subscription object that can be used to unsubscribe
     *
     * @example
     * ```ts
     * const subscription = await eventStore.observe({
     *   subject: '/recipes',
     *   recursive: true,
     *   handler: async (event) => {
     *     // Update read model
     *     await updateRecipeProjection(event);
     *   },
     *   onError: (error, event) => {
     *     console.error('Failed to process event:', error);
     *   }
     * });
     *
     * // Later, when shutting down:
     * await subscription.unsubscribe();
     * ```
     */
    observe: (
        config: EventStoreObserveConfig,
    ) => Promise<EventStoreSubscription>;
}

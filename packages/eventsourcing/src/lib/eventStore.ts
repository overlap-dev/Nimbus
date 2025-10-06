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
 * Event store interface.
 */
export interface EventStore {
    writeEvents: (
        events: Event[],
        options?: EventStoreWriteOptions,
    ) => Promise<EventWithMetadata[]>;

    readEvents: (
        subject: string,
        options?: EventStoreReadOptions,
    ) => Promise<EventWithMetadata[]>;
}

import { CloudEvent } from '@nimbus/core';

// TODO: this interface should be moved to @nimbus/core

export type EventStoreWriteEvent = {
    source: string;
    subject: string;
    type: string;
    data: any;
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

export interface EventStore {
    writeEvents: (
        events: EventStoreWriteEvent[],
    ) => Promise<CloudEvent<string, any>[]>;

    readEvents: (
        subject: string,
        options?: EventStoreReadOptions,
    ) => Promise<CloudEvent<string, any>[]>;
}

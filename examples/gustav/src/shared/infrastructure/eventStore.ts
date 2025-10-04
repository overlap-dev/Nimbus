import { EventSourcingDBStore } from '@nimbus/eventsourcingdb';
import { getEnv } from '@nimbus/utils';

export let eventStore: EventSourcingDBStore;

export const initEventStore = () => {
    const { EVENTSOURCINGDB_API, EVENTSOURCINGDB_SECRET } = getEnv({
        variables: ['EVENTSOURCINGDB_API', 'EVENTSOURCINGDB_SECRET'],
    });

    eventStore = new EventSourcingDBStore({
        apiUrl: EVENTSOURCINGDB_API,
        secret: EVENTSOURCINGDB_SECRET,
    });
};

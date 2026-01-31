import { getEventSourcingDBClient } from '@nimbus/eventsourcingdb';
import { Event } from 'eventsourcingdb';
import { projectViews } from '../../read/projectViews.ts';

export const handleEvent = async (event: Event) => {
    await projectViews(event);
};

export const initEventObserver = async (
    eventHandler: (event: Event) => Promise<void>,
) => {
    const eventSourcingDBClient = getEventSourcingDBClient();

    for await (
        const event of eventSourcingDBClient.observeEvents('/', {
            recursive: true,
        })
    ) {
        await eventHandler(event);
    }
};

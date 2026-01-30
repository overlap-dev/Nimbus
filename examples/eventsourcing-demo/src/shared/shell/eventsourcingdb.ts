import { Client, Event } from 'eventsourcingdb';
import { projectViews } from '../../read/projectViews.ts';

let esdbClient: Client | null = null;

export const setupEventsourcingdb = (url: URL, apiToken: string) => {
    esdbClient = new Client(
        url,
        apiToken,
    );
};

export const getEventsourcingdbClient = (): Client => {
    if (!esdbClient) {
        throw new Error('Eventsourcingdb client not initialized');
    }
    return esdbClient;
};

export const handleEvent = async (event: Event) => {
    await projectViews(event);
};

export const initEventObserver = async (
    eventHandler: (event: Event) => Promise<void>,
) => {
    const esdbClient = getEventsourcingdbClient();

    for await (
        const event of esdbClient.observeEvents('/', { recursive: true })
    ) {
        await eventHandler(event);
    }
};

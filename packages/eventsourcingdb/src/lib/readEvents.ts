import type { Event, ReadEventsOptions } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';
import { withAsyncGeneratorSpan } from './tracing.ts';

/**
 * Reads events from EventSourcingDB for a given subject.
 *
 * Returns an async generator that yields raw EventSourcingDB
 * {@link Event} instances (not Nimbus events). Use
 * {@link eventSourcingDBEventToNimbusEvent} to convert them
 * into Nimbus events if needed.
 *
 * @param subject - The subject to read events for.
 * @param options - Options to control which events are read.
 * @param signal - An optional abort signal to cancel the read.
 * @returns An async generator yielding EventSourcingDB events.
 */
export const readEvents = (
    subject: string,
    options: ReadEventsOptions,
    signal?: AbortSignal,
): AsyncGenerator<Event, void, void> => {
    return withAsyncGeneratorSpan('readEvents', () => {
        const eventSourcingDBClient = getEventSourcingDBClient();

        return eventSourcingDBClient.readEvents(
            subject,
            options,
            signal,
        );
    });
};

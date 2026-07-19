import type { Event } from '@nimbus-cqrs/core';
import { context, propagation } from '@opentelemetry/api';
import type { EventCandidate, Precondition } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';
import { nimbusEventToEventSourcingDBEventCandidate } from './eventMapping.ts';
import { eventSizeBytes, withSpan } from './tracing.ts';

const textEncoder = new TextEncoder();

/**
 * Returns the UTF-8 byte length of a serialized Nimbus event.
 */
const getEventSizeBytes = (event: Event): number =>
    textEncoder.encode(JSON.stringify(event)).length;

/**
 * Writes one or more Nimbus events to EventSourcingDB. Each event is
 * converted into an EventSourcingDB event candidate before being persisted.
 *
 * @param events - The Nimbus events to write.
 * @param preconditions - Optional preconditions that must be met for the write to succeed.
 */
export const writeEvents = (
    events: Event[],
    preconditions?: Precondition[],
): Promise<void> => {
    return withSpan('writeEvents', async () => {
        const eventSourcingDBClient = getEventSourcingDBClient();

        const carrier: Record<string, string> = {};
        propagation.inject(context.active(), carrier);

        const eventCandidates: EventCandidate[] = events.map((event) => {
            eventSizeBytes.record(getEventSizeBytes(event), {
                subject: event.subject,
                event_type: event.type,
            });

            return nimbusEventToEventSourcingDBEventCandidate(
                event,
                carrier['traceparent'],
                carrier['tracestate'],
            );
        });

        await eventSourcingDBClient.writeEvents(
            eventCandidates,
            preconditions,
        );
    });
};

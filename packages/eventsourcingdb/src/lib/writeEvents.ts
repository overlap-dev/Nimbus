import type { Event } from '@nimbus/core';
import { context, propagation } from '@opentelemetry/api';
import type { EventCandidate, Precondition } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';
import { nimbusEventToEventSourcingDBEventCandidate } from './eventMapping.ts';
import { withSpan } from './tracing.ts';

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

        const eventCandidates: EventCandidate[] = events.map((event) =>
            nimbusEventToEventSourcingDBEventCandidate(
                event,
                carrier['traceparent'],
                carrier['tracestate'],
            )
        );

        await eventSourcingDBClient.writeEvents(
            eventCandidates,
            preconditions,
        );
    });
};

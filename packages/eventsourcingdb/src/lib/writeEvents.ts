import type { Event } from '@nimbus-cqrs/core';
import { context, propagation } from '@opentelemetry/api';
import type {
    EventCandidate,
    Event as EventSourcingDBEvent,
    Precondition,
} from 'eventsourcingdb';
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
 * Returns the written EventSourcingDB events including the fields assigned
 * by the server (`id`, `time`, `hash`, ...). The `id` of the last written
 * event is the new revision of the subject and can be used with the
 * `isSubjectOnEventId` precondition for subsequent writes.
 *
 * The SDK never retries a write on its own. Errors are passed through:
 * - A `DbApiError` (from `eventsourcingdb`) when the server rejects the
 *   write, e.g. with `code === ErrorCode.preconditionViolated` when a
 *   precondition does not hold.
 * - An `OutcomeUnknownError` when the write may have been stored although
 *   the response was lost (stalled connection, abort after sending, ...).
 *   Its `cause` holds the original error. Read the subject back before
 *   writing again.
 *
 * @param events - The Nimbus events to write.
 * @param preconditions - Optional preconditions that must be met for the write to succeed.
 * @param signal - An optional abort signal to cancel the write. Aborting
 *   after the request has been sent does not undo the write; the call then
 *   throws an `OutcomeUnknownError`.
 * @returns The written EventSourcingDB events.
 */
export const writeEvents = (
    events: Event[],
    preconditions?: Precondition[],
    signal?: AbortSignal,
): Promise<EventSourcingDBEvent[]> => {
    return withSpan('writeEvents', async () => {
        const eventSourcingDBClient = getEventSourcingDBClient();

        const carrier: Record<string, string> = {};
        propagation.inject(context.active(), carrier);

        const eventCandidates: EventCandidate[] = events.map((event) => {
            eventSizeBytes.record(getEventSizeBytes(event));

            return nimbusEventToEventSourcingDBEventCandidate(
                event,
                carrier.traceparent,
                carrier.tracestate,
            );
        });

        return await eventSourcingDBClient.writeEvents(
            eventCandidates,
            preconditions,
            signal,
        );
    });
};

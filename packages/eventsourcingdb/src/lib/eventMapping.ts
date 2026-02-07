import { createEvent, type Event } from '@nimbus/core';
import { ulid } from '@std/ulid';
import type {
    Event as EventSourcingDBEvent,
    EventCandidate,
} from 'eventsourcingdb';

/**
 * Metadata that Nimbus attaches to events stored in EventSourcingDB
 * to preserve correlation and schema information.
 *
 * @property {string} correlationid - A globally unique identifier that indicates a correlation to previous and subsequent messages.
 * @property {string} dataschema - An absolute URL to the schema that the data adheres to (optional).
 */
export type NimbusEventMetadata = {
    correlationid: string;
    dataschema?: string;
};

/**
 * The data structure used to store Nimbus events in EventSourcingDB.
 * It wraps the original event payload together with Nimbus-specific metadata.
 *
 * @property {Record<string, unknown>} payload - The actual business data of the event.
 * @property {NimbusEventMetadata} nimbusMeta - Nimbus-specific metadata such as correlation id and data schema.
 */
export type EventData = {
    payload: Record<string, unknown>;
    nimbusMeta: NimbusEventMetadata;
};

/**
 * Type guard that checks whether the given value conforms to the {@link EventData} structure
 * by verifying the presence of both `payload` and `nimbusMeta` properties.
 *
 * @param data - The value to check.
 * @returns `true` if the value is an {@link EventData}, `false` otherwise.
 */
export const isEventData = (data: unknown): data is EventData => {
    return (
        typeof data === 'object' &&
        data !== null &&
        'payload' in data &&
        'nimbusMeta' in data
    );
};

/**
 * Converts a Nimbus {@link Event} into an EventSourcingDB {@link EventCandidate}
 * by mapping the event properties and wrapping the data with Nimbus metadata.
 *
 * @param event - The Nimbus event to convert.
 * @returns An EventSourcingDB event candidate ready to be written.
 */
export const nimbusEventToEventSourcingDBEventCandidate = (
    event: Event,
    traceparent?: string,
    tracestate?: string,
): EventCandidate => {
    return {
        source: event.source,
        subject: event.subject,
        type: event.type,
        data: {
            payload: event.data,
            nimbusMeta: {
                correlationid: event.correlationid,
                ...(event.dataschema && { dataschema: event.dataschema }),
            },
        },
        ...(traceparent && { traceparent: traceparent }),
        ...(tracestate && { tracestate: tracestate }),
    };
};

/**
 * Converts an EventSourcingDB event back into a Nimbus {@link Event}.
 * If the event data contains Nimbus metadata, it extracts the original payload
 * and correlation information. Otherwise, it treats the entire data as the payload
 * and generates a new correlation id.
 *
 * @param eventSourcingDBEvent - The EventSourcingDB event to convert.
 * @returns A Nimbus event.
 */
export const eventSourcingDBEventToNimbusEvent = <TEvent extends Event>(
    eventSourcingDBEvent: EventSourcingDBEvent,
): TEvent => {
    let data: Record<string, unknown>;
    let correlationid: string;
    let dataschema: string | undefined;

    if (isEventData(eventSourcingDBEvent.data)) {
        data = eventSourcingDBEvent.data.payload;
        correlationid = eventSourcingDBEvent.data.nimbusMeta.correlationid;
        dataschema = eventSourcingDBEvent.data.nimbusMeta.dataschema;
    } else {
        data = eventSourcingDBEvent.data;
        correlationid = ulid();
    }

    return createEvent({
        id: eventSourcingDBEvent.id,
        time: eventSourcingDBEvent.time.toISOString(),
        source: eventSourcingDBEvent.source,
        subject: eventSourcingDBEvent.subject,
        type: eventSourcingDBEvent.type,
        correlationid: correlationid,
        data: data,
        ...(dataschema && { dataschema: dataschema }),
    });
};

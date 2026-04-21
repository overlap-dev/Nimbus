import type { Event } from '@nimbus-cqrs/core';
import { createEvent } from '@nimbus-cqrs/core';
import { assertEquals, assertNotEquals } from '@std/assert';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import {
    type EventData,
    eventSourcingDBEventToNimbusEvent,
    isEventData,
    nimbusEventToEventSourcingDBEventCandidate,
} from './eventMapping.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestNimbusEvent = (
    overrides: Partial<Event> = {},
): Event => {
    return createEvent({
        source: 'https://nimbus.test',
        type: 'at.test.nimbus.test-event',
        subject: '/tests/1',
        data: { message: 'hello' },
        correlationid: 'corr-123',
        ...overrides,
    });
};

const createTestEventSourcingDBEvent = (
    overrides: Partial<{
        id: string;
        time: Date;
        source: string;
        subject: string;
        type: string;
        data: Record<string, unknown>;
    }> = {},
): EventSourcingDBEvent => {
    const defaults = {
        id: '1',
        time: new Date('2025-06-01T12:00:00.000Z'),
        source: 'https://nimbus.test',
        subject: '/tests/1',
        type: 'at.test.nimbus.test-event',
        data: {
            payload: { message: 'hello' },
            nimbusMeta: {
                correlationid: 'corr-123',
            },
        } as Record<string, unknown>,
    };

    // The eventsourcingdb Event class has private fields and cannot be
    // constructed outside its own module.  Since eventMapping.ts only
    // accesses plain public properties we use a plain object cast to
    // satisfy the runtime while keeping type-safety in the test.
    return { ...defaults, ...overrides } as unknown as EventSourcingDBEvent;
};

// ---------------------------------------------------------------------------
// isEventData
// ---------------------------------------------------------------------------

Deno.test('isEventData returns true for valid EventData', () => {
    const data: EventData = {
        payload: { key: 'value' },
        nimbusMeta: { correlationid: 'corr-1' },
    };

    assertEquals(isEventData(data), true);
});

Deno.test('isEventData returns true when nimbusMeta includes dataschema', () => {
    const data: EventData = {
        payload: { key: 'value' },
        nimbusMeta: {
            correlationid: 'corr-1',
            dataschema: 'https://schema.example.com/v1',
        },
    };

    assertEquals(isEventData(data), true);
});

Deno.test('isEventData returns false for null', () => {
    assertEquals(isEventData(null), false);
});

Deno.test('isEventData returns false for undefined', () => {
    assertEquals(isEventData(undefined), false);
});

Deno.test('isEventData returns false for a string', () => {
    assertEquals(isEventData('not an object'), false);
});

Deno.test('isEventData returns false for a number', () => {
    assertEquals(isEventData(42), false);
});

Deno.test('isEventData returns false for an object missing nimbusMeta', () => {
    assertEquals(isEventData({ payload: { key: 'value' } }), false);
});

Deno.test('isEventData returns false for an object missing payload', () => {
    assertEquals(
        isEventData({ nimbusMeta: { correlationid: 'corr-1' } }),
        false,
    );
});

Deno.test('isEventData returns false for an empty object', () => {
    assertEquals(isEventData({}), false);
});

// ---------------------------------------------------------------------------
// nimbusEventToEventSourcingDBEventCandidate
// ---------------------------------------------------------------------------

Deno.test('nimbusEventToEventSourcingDBEventCandidate maps basic properties', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);

    assertEquals(candidate.source, event.source);
    assertEquals(candidate.subject, event.subject);
    assertEquals(candidate.type, event.type);
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate wraps data with nimbusMeta', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);
    const data = candidate.data as EventData;

    assertEquals(data.payload, event.data);
    assertEquals(data.nimbusMeta.correlationid, event.correlationid);
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate includes dataschema in nimbusMeta when present', () => {
    const event = createTestNimbusEvent({
        dataschema: 'https://schema.example.com/v1',
    });

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);
    const data = candidate.data as EventData;

    assertEquals(
        data.nimbusMeta.dataschema,
        'https://schema.example.com/v1',
    );
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate omits dataschema from nimbusMeta when absent', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);
    const data = candidate.data as EventData;

    assertEquals(data.nimbusMeta.dataschema, undefined);
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate includes traceparent when provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(
        event,
        '00-abc-def-01',
    );

    assertEquals(candidate.traceparent, '00-abc-def-01');
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate includes tracestate when provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(
        event,
        '00-abc-def-01',
        'vendor=value',
    );

    assertEquals(candidate.traceparent, '00-abc-def-01');
    assertEquals(candidate.tracestate, 'vendor=value');
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate omits traceparent when not provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);

    assertEquals(candidate.traceparent, undefined);
});

Deno.test('nimbusEventToEventSourcingDBEventCandidate omits tracestate when not provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(
        event,
        '00-abc-def-01',
    );

    assertEquals(candidate.tracestate, undefined);
});

// ---------------------------------------------------------------------------
// eventSourcingDBEventToNimbusEvent
// ---------------------------------------------------------------------------

Deno.test('eventSourcingDBEventToNimbusEvent maps event with nimbusMeta correctly', () => {
    const esdbEvent = createTestEventSourcingDBEvent();

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assertEquals(nimbusEvent.specversion, '1.0');
    assertEquals(nimbusEvent.id, '1');
    assertEquals(nimbusEvent.time, '2025-06-01T12:00:00.000Z');
    assertEquals(nimbusEvent.source, 'https://nimbus.test');
    assertEquals(nimbusEvent.subject, '/tests/1');
    assertEquals(nimbusEvent.type, 'at.test.nimbus.test-event');
    assertEquals(nimbusEvent.data, { message: 'hello' });
    assertEquals(nimbusEvent.correlationid, 'corr-123');
});

Deno.test('eventSourcingDBEventToNimbusEvent extracts dataschema from nimbusMeta', () => {
    const esdbEvent = createTestEventSourcingDBEvent({
        data: {
            payload: { message: 'hello' },
            nimbusMeta: {
                correlationid: 'corr-123',
                dataschema: 'https://schema.example.com/v1',
            },
        },
    });

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assertEquals(
        nimbusEvent.dataschema,
        'https://schema.example.com/v1',
    );
});

Deno.test('eventSourcingDBEventToNimbusEvent omits dataschema when nimbusMeta has none', () => {
    const esdbEvent = createTestEventSourcingDBEvent();

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assertEquals(nimbusEvent.dataschema, undefined);
});

Deno.test('eventSourcingDBEventToNimbusEvent handles event without nimbusMeta', () => {
    const esdbEvent = createTestEventSourcingDBEvent({
        data: { rawKey: 'rawValue' },
    });

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assertEquals(nimbusEvent.data, { rawKey: 'rawValue' });
    assertEquals(nimbusEvent.dataschema, undefined);
    // A new correlationid should be generated (ULID format)
    assertNotEquals(nimbusEvent.correlationid, undefined);
    assertNotEquals(nimbusEvent.correlationid, '');
});

Deno.test('eventSourcingDBEventToNimbusEvent generates different correlationid for non-nimbus events', () => {
    const esdbEvent = createTestEventSourcingDBEvent({
        data: { rawKey: 'rawValue' },
    });

    const first = eventSourcingDBEventToNimbusEvent(esdbEvent);
    const second = eventSourcingDBEventToNimbusEvent(esdbEvent);

    // Each call should produce a unique correlation id
    assertNotEquals(first.correlationid, second.correlationid);
});

// ---------------------------------------------------------------------------
// Round-trip: Nimbus → EventSourcingDB → Nimbus
// ---------------------------------------------------------------------------

Deno.test('round-trip preserves event data through mapping', () => {
    const original = createTestNimbusEvent({
        id: 'round-trip-id',
        correlationid: 'round-trip-corr',
        dataschema: 'https://schema.example.com/v1',
    });

    const candidate = nimbusEventToEventSourcingDBEventCandidate(original);

    // Simulate what EventSourcingDB would store and return
    const storedEvent = createTestEventSourcingDBEvent({
        id: original.id,
        time: new Date(original.time),
        source: candidate.source,
        subject: candidate.subject,
        type: candidate.type,
        data: candidate.data,
    });

    const restored = eventSourcingDBEventToNimbusEvent(storedEvent);

    assertEquals(restored.id, original.id);
    assertEquals(restored.source, original.source);
    assertEquals(restored.subject, original.subject);
    assertEquals(restored.type, original.type);
    assertEquals(restored.data, original.data);
    assertEquals(restored.correlationid, original.correlationid);
    assertEquals(restored.dataschema, original.dataschema);
});

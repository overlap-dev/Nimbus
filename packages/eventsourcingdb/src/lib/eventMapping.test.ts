import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Event } from '@nimbus-cqrs/core';
import { createEvent } from '@nimbus-cqrs/core';
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

const createTestNimbusEvent = (overrides: Partial<Event> = {}): Event => {
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

test('isEventData returns true for valid EventData', () => {
    const data: EventData = {
        payload: { key: 'value' },
        nimbusMeta: { correlationid: 'corr-1' },
    };

    assert.deepEqual(isEventData(data), true);
});

test('isEventData returns true when nimbusMeta includes dataschema', () => {
    const data: EventData = {
        payload: { key: 'value' },
        nimbusMeta: {
            correlationid: 'corr-1',
            dataschema: 'https://schema.example.com/v1',
        },
    };

    assert.deepEqual(isEventData(data), true);
});

test('isEventData returns false for null', () => {
    assert.deepEqual(isEventData(null), false);
});

test('isEventData returns false for undefined', () => {
    assert.deepEqual(isEventData(undefined), false);
});

test('isEventData returns false for a string', () => {
    assert.deepEqual(isEventData('not an object'), false);
});

test('isEventData returns false for a number', () => {
    assert.deepEqual(isEventData(42), false);
});

test('isEventData returns false for an object missing nimbusMeta', () => {
    assert.deepEqual(isEventData({ payload: { key: 'value' } }), false);
});

test('isEventData returns false for an object missing payload', () => {
    assert.deepEqual(
        isEventData({ nimbusMeta: { correlationid: 'corr-1' } }),
        false,
    );
});

test('isEventData returns false for an empty object', () => {
    assert.deepEqual(isEventData({}), false);
});

// ---------------------------------------------------------------------------
// nimbusEventToEventSourcingDBEventCandidate
// ---------------------------------------------------------------------------

test('nimbusEventToEventSourcingDBEventCandidate maps basic properties', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);

    assert.deepEqual(candidate.source, event.source);
    assert.deepEqual(candidate.subject, event.subject);
    assert.deepEqual(candidate.type, event.type);
});

test('nimbusEventToEventSourcingDBEventCandidate wraps data with nimbusMeta', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);
    const data = candidate.data as EventData;

    assert.deepEqual(data.payload, event.data);
    assert.deepEqual(data.nimbusMeta.correlationid, event.correlationid);
});

test('nimbusEventToEventSourcingDBEventCandidate includes dataschema in nimbusMeta when present', () => {
    const event = createTestNimbusEvent({
        dataschema: 'https://schema.example.com/v1',
    });

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);
    const data = candidate.data as EventData;

    assert.deepEqual(
        data.nimbusMeta.dataschema,
        'https://schema.example.com/v1',
    );
});

test('nimbusEventToEventSourcingDBEventCandidate omits dataschema from nimbusMeta when absent', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);
    const data = candidate.data as EventData;

    assert.deepEqual(data.nimbusMeta.dataschema, undefined);
});

test('nimbusEventToEventSourcingDBEventCandidate includes traceparent when provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(
        event,
        '00-abc-def-01',
    );

    assert.deepEqual(candidate.traceparent, '00-abc-def-01');
});

test('nimbusEventToEventSourcingDBEventCandidate includes tracestate when provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(
        event,
        '00-abc-def-01',
        'vendor=value',
    );

    assert.deepEqual(candidate.traceparent, '00-abc-def-01');
    assert.deepEqual(candidate.tracestate, 'vendor=value');
});

test('nimbusEventToEventSourcingDBEventCandidate omits traceparent when not provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(event);

    assert.deepEqual(candidate.traceparent, undefined);
});

test('nimbusEventToEventSourcingDBEventCandidate omits tracestate when not provided', () => {
    const event = createTestNimbusEvent();

    const candidate = nimbusEventToEventSourcingDBEventCandidate(
        event,
        '00-abc-def-01',
    );

    assert.deepEqual(candidate.tracestate, undefined);
});

// ---------------------------------------------------------------------------
// eventSourcingDBEventToNimbusEvent
// ---------------------------------------------------------------------------

test('eventSourcingDBEventToNimbusEvent maps event with nimbusMeta correctly', () => {
    const esdbEvent = createTestEventSourcingDBEvent();

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assert.deepEqual(nimbusEvent.specversion, '1.0');
    assert.deepEqual(nimbusEvent.id, '1');
    assert.deepEqual(nimbusEvent.time, '2025-06-01T12:00:00.000Z');
    assert.deepEqual(nimbusEvent.source, 'https://nimbus.test');
    assert.deepEqual(nimbusEvent.subject, '/tests/1');
    assert.deepEqual(nimbusEvent.type, 'at.test.nimbus.test-event');
    assert.deepEqual(nimbusEvent.data, { message: 'hello' });
    assert.deepEqual(nimbusEvent.correlationid, 'corr-123');
});

test('eventSourcingDBEventToNimbusEvent extracts dataschema from nimbusMeta', () => {
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

    assert.deepEqual(nimbusEvent.dataschema, 'https://schema.example.com/v1');
});

test('eventSourcingDBEventToNimbusEvent omits dataschema when nimbusMeta has none', () => {
    const esdbEvent = createTestEventSourcingDBEvent();

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assert.deepEqual(nimbusEvent.dataschema, undefined);
});

test('eventSourcingDBEventToNimbusEvent handles event without nimbusMeta', () => {
    const esdbEvent = createTestEventSourcingDBEvent({
        data: { rawKey: 'rawValue' },
    });

    const nimbusEvent = eventSourcingDBEventToNimbusEvent(esdbEvent);

    assert.deepEqual(nimbusEvent.data, { rawKey: 'rawValue' });
    assert.deepEqual(nimbusEvent.dataschema, undefined);
    // A new correlationid should be generated (ULID format)
    assert.notDeepEqual(nimbusEvent.correlationid, undefined);
    assert.notDeepEqual(nimbusEvent.correlationid, '');
});

test('eventSourcingDBEventToNimbusEvent generates different correlationid for non-nimbus events', () => {
    const esdbEvent = createTestEventSourcingDBEvent({
        data: { rawKey: 'rawValue' },
    });

    const first = eventSourcingDBEventToNimbusEvent(esdbEvent);
    const second = eventSourcingDBEventToNimbusEvent(esdbEvent);

    // Each call should produce a unique correlation id
    assert.notDeepEqual(first.correlationid, second.correlationid);
});

// ---------------------------------------------------------------------------
// Round-trip: Nimbus → EventSourcingDB → Nimbus
// ---------------------------------------------------------------------------

test('round-trip preserves event data through mapping', () => {
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

    assert.deepEqual(restored.id, original.id);
    assert.deepEqual(restored.source, original.source);
    assert.deepEqual(restored.subject, original.subject);
    assert.deepEqual(restored.type, original.type);
    assert.deepEqual(restored.data, original.data);
    assert.deepEqual(restored.correlationid, original.correlationid);
    assert.deepEqual(restored.dataschema, original.dataschema);
});

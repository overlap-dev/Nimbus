import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GenericException } from '@nimbus-cqrs/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { CLOUDEVENTS_NAMESPACE, CLOUDEVENTS_SOURCE } from '../../namespace.ts';
import {
    createObserverGroup,
    type ObserverCheckpointStore,
    type ObserverConsumer,
} from './observer-group.ts';

const event = {
    id: '2',
    type: `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.created`,
    source: CLOUDEVENTS_SOURCE,
    subject: '/ticketing/tickets/1',
    time: new Date('2026-10-07T08:39:24.262Z'),
    data: {},
} as EventSourcingDBEvent;

const checkpoints: ObserverCheckpointStore = {
    getPositions: () => {
        return Promise.resolve(new Map());
    },
    savePositions: () => {
        return Promise.resolve();
    },
};

test('apply failure keeps the consumer error on the observer exception', async () => {
    const consumer: ObserverConsumer = {
        name: 'ticketing.tickets',
        handles: () => {
            return true;
        },
        apply: () => {
            return Promise.reject(
                new Error('input must be a 24 character hex string'),
            );
        },
    };
    const group = await createObserverGroup({
        groupName: '/ticketing/tickets',
        consumers: [consumer],
        checkpoints,
    });

    const error = await group.eventHandler(event).then(
        () => {
            throw new Error('expected the event handler to reject');
        },
        (reason: unknown) => reason,
    );

    assert.ok(error instanceof GenericException);
    assert.match(
        error.message,
        /ticketing\.tickets: Error: input must be a 24 character hex string/,
    );
    assert.equal(
        error.cause instanceof Error ? error.cause.message : undefined,
        'input must be a 24 character hex string',
    );

    const consumers = error.details?.consumers as
        | Record<string, { name: string; message: string; stack?: string }>
        | undefined;
    const reported = consumers?.['ticketing.tickets'];

    assert.ok(reported !== undefined);
    assert.equal(reported.name, 'Error');
    assert.equal(reported.message, 'input must be a 24 character hex string');
    assert.equal(typeof reported.stack, 'string');
});

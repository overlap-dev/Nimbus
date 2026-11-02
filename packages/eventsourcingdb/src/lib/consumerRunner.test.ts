import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    type CheckpointStore,
    GenericException,
    InMemoryCheckpointStore,
} from '@nimbus-cqrs/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { createConsumerRunner } from './consumerRunner.ts';
import type { EventConsumer } from './eventConsumer.ts';

const OBSERVER = 'ticketing';

const rawEvent = (id: string, type = 'at.test.ticket.created') => {
    return {
        id,
        type,
        source: 'https://nimbus.test',
        subject: '/ticketing/tickets/1',
        time: new Date('2026-10-07T08:39:24.262Z'),
        data: {
            payload: { ticketId: '1' },
            nimbusMeta: { correlationid: 'corr-1' },
        },
    } as unknown as EventSourcingDBEvent;
};

const consumer = (
    name: string,
    overrides: Partial<EventConsumer> = {},
): EventConsumer => {
    return {
        name,
        handles: () => {
            return true;
        },
        handle: () => {
            return Promise.resolve();
        },
        ...overrides,
    };
};

const positionsOf = async (store: CheckpointStore, names: string[]) => {
    const checkpoints = await store.load(names);

    return Object.fromEntries(
        names.map((name) => {
            return [name, checkpoints.get(name)?.position];
        }),
    );
};

test('lower bound is inclusive 0 when any consumer has no checkpoint', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save([{ consumer: 'a', observer: OBSERVER, position: '10' }]);

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [consumer('a'), consumer('b')],
        checkpointStore: store,
    });

    assert.deepEqual(runner.lowerBound, { id: '0', type: 'inclusive' });
});

test('lower bound is the lowest checkpoint, exclusive', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save([
        { consumer: 'a', observer: OBSERVER, position: '10' },
        { consumer: 'b', observer: OBSERVER, position: '7' },
    ]);

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [consumer('a'), consumer('b')],
        checkpointStore: store,
    });

    assert.deepEqual(runner.lowerBound, { id: '7', type: 'exclusive' });
});

test('consumers already past an event skip it but advance on new ones', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save([{ consumer: 'a', observer: OBSERVER, position: '10' }]);
    const handledByA: string[] = [];
    const handledByB: string[] = [];

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('a', {
                handle: (event) => {
                    handledByA.push(event.id);
                    return Promise.resolve();
                },
            }),
            consumer('b', {
                handle: (event) => {
                    handledByB.push(event.id);
                    return Promise.resolve();
                },
            }),
        ],
        checkpointStore: store,
    });

    await runner.handle(rawEvent('9'));
    await runner.handle(rawEvent('11'));

    assert.deepEqual(handledByA, ['11']);
    assert.deepEqual(handledByB, ['9', '11']);
    assert.deepEqual(await positionsOf(store, ['a', 'b']), {
        a: '11',
        b: '11',
    });
});

test('handle receives the mapped Nimbus event and the raw event', async () => {
    const store = new InMemoryCheckpointStore();
    let received: unknown[] = [];

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('a', {
                handle: (event, raw) => {
                    received = [event, raw];
                    return Promise.resolve();
                },
            }),
        ],
        checkpointStore: store,
    });

    const raw = rawEvent('1');
    await runner.handle(raw);

    const [event] = received as [
        { id: string; data: unknown; correlationid: string },
        EventSourcingDBEvent,
    ];
    assert.equal(event.id, '1');
    assert.equal(event.correlationid, 'corr-1');
    assert.deepEqual(event.data, { ticketId: '1' });
    assert.equal(received[1], raw);
});

test('events a consumer does not handle still advance its checkpoint', async () => {
    const store = new InMemoryCheckpointStore();
    let calls = 0;

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('a', {
                handles: () => {
                    return false;
                },
                handle: () => {
                    calls++;
                    return Promise.resolve();
                },
            }),
        ],
        checkpointStore: store,
    });

    await runner.handle(rawEvent('5'));

    assert.equal(calls, 0);
    assert.deepEqual(await positionsOf(store, ['a']), { a: '5' });
});

test('a failing consumer holds its position while siblings advance', async () => {
    const store = new InMemoryCheckpointStore();

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('ok-before'),
            consumer('failing', {
                handle: () => {
                    return Promise.reject(
                        new Error('input must be a 24 character hex string'),
                    );
                },
            }),
            consumer('ok-after'),
        ],
        checkpointStore: store,
    });

    const error = await runner.handle(rawEvent('2')).then(
        () => {
            throw new Error('expected the handler to reject');
        },
        (reason: unknown) => reason,
    );

    assert.ok(error instanceof GenericException);
    assert.match(
        error.message,
        /failing: Error: input must be a 24 character hex string/,
    );
    assert.equal(
        error.cause instanceof Error ? error.cause.message : undefined,
        'input must be a 24 character hex string',
    );

    const consumers = error.details?.consumers as
        | Record<string, { name: string; message: string; stack?: string }>
        | undefined;
    const reported = consumers?.failing;

    assert.ok(reported !== undefined);
    assert.equal(reported.name, 'Error');
    assert.equal(reported.message, 'input must be a 24 character hex string');
    assert.equal(typeof reported.stack, 'string');

    assert.deepEqual(
        await positionsOf(store, ['ok-before', 'failing', 'ok-after']),
        { 'ok-before': '2', failing: undefined, 'ok-after': '2' },
    );
});

test('on retry only the failed consumer runs again', async () => {
    const store = new InMemoryCheckpointStore();
    const calls: string[] = [];
    let attempts = 0;

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('a', {
                handle: () => {
                    calls.push('a');
                    return Promise.resolve();
                },
            }),
            consumer('b', {
                handle: () => {
                    calls.push('b');
                    attempts++;
                    return attempts === 1
                        ? Promise.reject(new Error('transient'))
                        : Promise.resolve();
                },
            }),
        ],
        checkpointStore: store,
    });

    await assert.rejects(runner.handle(rawEvent('3')));
    await runner.handle(rawEvent('3'));

    assert.deepEqual(calls, ['a', 'b', 'b']);
    assert.deepEqual(await positionsOf(store, ['a', 'b']), {
        a: '3',
        b: '3',
    });
});

test('onExhausted halts the failed consumers and persists the failure', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save([
        { consumer: 'failing', observer: OBSERVER, position: '1' },
    ]);
    const handledByFailing: string[] = [];

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('ok'),
            consumer('failing', {
                handle: (event) => {
                    handledByFailing.push(event.id);
                    return Promise.reject(new Error('boom'));
                },
            }),
        ],
        checkpointStore: store,
    });

    const event = rawEvent('2');
    const error = await runner.handle(event).catch((reason: unknown) => {
        return reason as Error;
    });
    await runner.onExhausted(error as Error, event);

    const status = runner.status();
    assert.deepEqual(
        status.map((consumer) => {
            return [consumer.name, consumer.halted, consumer.position];
        }),
        [
            ['ok', false, '2'],
            ['failing', true, '1'],
        ],
    );
    assert.equal(status[1]?.failure?.position, '2');
    assert.equal(status[1]?.failure?.error, 'Error: boom');

    const stored = (await store.load(['failing'])).get('failing');
    assert.equal(stored?.position, '1');
    assert.equal(stored?.failure?.position, '2');
    assert.equal(stored?.failure?.error, 'Error: boom');

    // Halted consumers are skipped from now on, siblings continue.
    await runner.handle(rawEvent('3'));

    assert.deepEqual(handledByFailing, ['2']);
    assert.deepEqual(await positionsOf(store, ['ok', 'failing']), {
        ok: '3',
        failing: '1',
    });
});

test('onExhausted halts every consumer when the failure happened outside a consumer', async () => {
    const store = new InMemoryCheckpointStore();

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [consumer('a'), consumer('b')],
        checkpointStore: store,
    });

    await runner.onExhausted(new Error('flush failed'), rawEvent('1'));

    assert.deepEqual(
        runner.status().map((consumer) => {
            return consumer.halted;
        }),
        [true, true],
    );
});

test('a successful event clears a failure loaded from the checkpoint store', async () => {
    const store = new InMemoryCheckpointStore();
    await store.save([
        {
            consumer: 'a',
            observer: OBSERVER,
            position: '1',
            failure: { position: '2', error: 'Error: boom' },
        },
    ]);

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [consumer('a')],
        checkpointStore: store,
    });

    assert.equal(runner.status()[0]?.failure?.position, '2');

    await runner.handle(rawEvent('2'));

    assert.equal(runner.status()[0]?.failure, undefined);
    assert.equal((await store.load(['a'])).get('a')?.failure, undefined);
});

test('a dependent holds its position when its dependency fails on the event', async () => {
    const store = new InMemoryCheckpointStore();
    const dependentCalls: string[] = [];

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('projection', {
                handle: () => {
                    return Promise.reject(new Error('db down'));
                },
            }),
            consumer('mailer', {
                dependsOn: ['projection'],
                handle: (event) => {
                    dependentCalls.push(event.id);
                    return Promise.resolve();
                },
            }),
            consumer('unrelated'),
        ],
        checkpointStore: store,
    });

    const error = await runner.handle(rawEvent('4')).catch((reason) => {
        return reason as GenericException;
    });

    assert.ok(error instanceof GenericException);
    assert.match(error.message, /projection: Error: db down/);
    assert.match(
        error.message,
        /mailer: .*Dependency "projection" did not finish event 4/,
    );
    assert.deepEqual(dependentCalls, []);
    assert.deepEqual(
        await positionsOf(store, ['projection', 'mailer', 'unrelated']),
        { projection: undefined, mailer: undefined, unrelated: '4' },
    );
});

test('a dependent is halted together with its dependency', async () => {
    const store = new InMemoryCheckpointStore();

    const runner = await createConsumerRunner({
        observer: OBSERVER,
        consumers: [
            consumer('projection', {
                handle: () => {
                    return Promise.reject(new Error('db down'));
                },
            }),
            consumer('mailer', { dependsOn: ['projection'] }),
        ],
        checkpointStore: store,
    });

    const event = rawEvent('4');
    const error = await runner.handle(event).catch((reason) => {
        return reason as Error;
    });
    await runner.onExhausted(error as Error, event);

    assert.deepEqual(
        runner.status().map((consumer) => {
            return [consumer.name, consumer.halted];
        }),
        [
            ['projection', true],
            ['mailer', true],
        ],
    );
    assert.match(
        (await store.load(['mailer'])).get('mailer')?.failure?.error ?? '',
        /Dependency "projection"/,
    );
});

test('a dependency that is not declared before the dependent is rejected', async () => {
    await assert.rejects(
        createConsumerRunner({
            observer: OBSERVER,
            consumers: [
                consumer('mailer', { dependsOn: ['projection'] }),
                consumer('projection'),
            ],
            checkpointStore: new InMemoryCheckpointStore(),
        }),
        /depends on "projection", which is not declared before it/,
    );
});

test('duplicate consumer names are rejected', async () => {
    await assert.rejects(
        createConsumerRunner({
            observer: OBSERVER,
            consumers: [consumer('a'), consumer('a')],
            checkpointStore: new InMemoryCheckpointStore(),
        }),
        /declares consumer "a" more than once/,
    );
});

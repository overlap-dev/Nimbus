import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkpointSchema } from './checkpoint.ts';
import { InMemoryCheckpointStore } from './inMemoryCheckpointStore.ts';

test('load omits consumers without a checkpoint', async () => {
    const store = new InMemoryCheckpointStore();

    const checkpoints = await store.load(['tickets', 'mails']);

    assert.equal(checkpoints.size, 0);
});

test('save persists the position and load returns a valid checkpoint', async () => {
    const store = new InMemoryCheckpointStore();

    await store.save([
        { consumer: 'tickets', observer: 'ticketing', position: '42' },
    ]);

    const checkpoint = (await store.load(['tickets'])).get('tickets');

    assert.ok(checkpoint !== undefined);
    assert.equal(checkpoint.consumer, 'tickets');
    assert.equal(checkpoint.observer, 'ticketing');
    assert.equal(checkpoint.position, '42');
    assert.equal(checkpoint.failure, undefined);
    assert.doesNotThrow(() => checkpointSchema.parse(checkpoint));
});

test('save records a failure and keeps the previous position', async () => {
    const store = new InMemoryCheckpointStore();

    await store.save([
        { consumer: 'tickets', observer: 'ticketing', position: '42' },
    ]);
    await store.save([
        {
            consumer: 'tickets',
            observer: 'ticketing',
            failure: { position: '43', error: 'Error: boom' },
        },
    ]);

    const checkpoint = (await store.load(['tickets'])).get('tickets');

    assert.equal(checkpoint?.position, '42');
    assert.equal(checkpoint?.failure?.position, '43');
    assert.equal(checkpoint?.failure?.error, 'Error: boom');
    assert.equal(typeof checkpoint?.failure?.at, 'string');
});

test('a save without failure clears an existing failure marker', async () => {
    const store = new InMemoryCheckpointStore();

    await store.save([
        {
            consumer: 'tickets',
            observer: 'ticketing',
            position: '42',
            failure: { position: '43', error: 'Error: boom' },
        },
    ]);
    await store.save([
        { consumer: 'tickets', observer: 'ticketing', position: '43' },
    ]);

    const checkpoint = (await store.load(['tickets'])).get('tickets');

    assert.equal(checkpoint?.position, '43');
    assert.equal(checkpoint?.failure, undefined);
});

test('load returns copies that do not leak into the store', async () => {
    const store = new InMemoryCheckpointStore();

    await store.save([
        { consumer: 'tickets', observer: 'ticketing', position: '42' },
    ]);

    const first = (await store.load(['tickets'])).get('tickets');
    if (first !== undefined) {
        first.position = '999';
    }

    const second = (await store.load(['tickets'])).get('tickets');

    assert.equal(second?.position, '42');
});

test('reset moves the consumer to the given position and clears the failure', async () => {
    const store = new InMemoryCheckpointStore();

    await store.save([
        {
            consumer: 'tickets',
            observer: 'ticketing',
            position: '42',
            failure: { position: '43', error: 'Error: boom' },
        },
    ]);
    await store.reset('tickets', '10');

    const checkpoint = (await store.load(['tickets'])).get('tickets');

    assert.equal(checkpoint?.position, '10');
    assert.equal(checkpoint?.failure, undefined);
    assert.equal(checkpoint?.observer, 'ticketing');
});

test('reset without a position replays from the beginning', async () => {
    const store = new InMemoryCheckpointStore();

    await store.save([
        { consumer: 'tickets', observer: 'ticketing', position: '42' },
    ]);
    await store.reset('tickets');

    const checkpoint = (await store.load(['tickets'])).get('tickets');

    assert.ok(checkpoint !== undefined);
    assert.equal(checkpoint.position, undefined);
});

test('reset of an unknown consumer is a no-op', async () => {
    const store = new InMemoryCheckpointStore();

    await store.reset('unknown', '1');

    assert.equal((await store.load(['unknown'])).size, 0);
});

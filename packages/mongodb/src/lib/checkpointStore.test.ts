import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Collection, Document } from 'mongodb';
import {
    MONGO_CHECKPOINTS_COLLECTION,
    MongoCheckpointStore,
} from './checkpointStore.ts';

type Call = { method: string; args: unknown[] };

/**
 * A minimal in-memory stand-in for the few collection methods the store
 * uses. Records every call so the tests can assert on the issued
 * operations.
 */
const fakeCollection = (documents: Document[] = []) => {
    const calls: Call[] = [];

    const collection = {
        find: (filter: Document) => {
            calls.push({ method: 'find', args: [filter] });
            const names: string[] = filter.consumer.$in;

            return {
                toArray: () =>
                    Promise.resolve(
                        documents.filter((document) =>
                            names.includes(document.consumer),
                        ),
                    ),
            };
        },
        bulkWrite: (operations: unknown[], options: unknown) => {
            calls.push({ method: 'bulkWrite', args: [operations, options] });
            return Promise.resolve({});
        },
        updateOne: (filter: Document, update: Document) => {
            calls.push({ method: 'updateOne', args: [filter, update] });
            return Promise.resolve({});
        },
    } as unknown as Collection<Document>;

    return { collection, calls };
};

test('the checkpoints collection has a unique index on consumer', () => {
    assert.equal(MONGO_CHECKPOINTS_COLLECTION.name, 'checkpoints');
    assert.deepEqual(MONGO_CHECKPOINTS_COLLECTION.indexes, [
        { key: { consumer: 1 }, unique: true },
    ]);
});

test('load maps documents to checkpoints and converts dates', async () => {
    const updatedAt = new Date('2026-10-07T08:39:24.262Z');
    const failedAt = new Date('2026-10-07T09:00:00.000Z');
    const { collection, calls } = fakeCollection([
        {
            _id: 'x',
            consumer: 'tickets',
            observer: 'ticketing',
            position: '42',
            updatedAt,
        },
        {
            _id: 'y',
            consumer: 'mails',
            observer: 'ticketing',
            updatedAt: updatedAt.toISOString(),
            failure: { position: '1', error: 'Error: boom', at: failedAt },
        },
        {
            _id: 'z',
            consumer: 'other',
            observer: 'ticketing',
            position: '7',
            updatedAt,
        },
    ]);
    const store = new MongoCheckpointStore(() => Promise.resolve(collection));

    const checkpoints = await store.load(['tickets', 'mails', 'missing']);

    assert.deepEqual(calls[0]?.args[0], {
        consumer: { $in: ['tickets', 'mails', 'missing'] },
    });
    assert.equal(checkpoints.size, 2);
    assert.deepEqual(checkpoints.get('tickets'), {
        consumer: 'tickets',
        observer: 'ticketing',
        position: '42',
        updatedAt: '2026-10-07T08:39:24.262Z',
    });
    assert.deepEqual(checkpoints.get('mails'), {
        consumer: 'mails',
        observer: 'ticketing',
        updatedAt: '2026-10-07T08:39:24.262Z',
        failure: {
            position: '1',
            error: 'Error: boom',
            at: '2026-10-07T09:00:00.000Z',
        },
    });
});

test('save issues one unordered bulk upsert and clears failure when absent', async () => {
    const { collection, calls } = fakeCollection();
    const store = new MongoCheckpointStore(() => Promise.resolve(collection));

    await store.save([
        { consumer: 'tickets', observer: 'ticketing', position: '42' },
        {
            consumer: 'mails',
            observer: 'ticketing',
            failure: { position: '43', error: 'Error: boom' },
        },
    ]);

    assert.equal(calls.length, 1);
    const [operations, options] = calls[0]!.args as [Document[], unknown];
    assert.deepEqual(options, { ordered: false });
    assert.equal(operations.length, 2);

    const first = operations[0]?.updateOne;
    assert.deepEqual(first.filter, { consumer: 'tickets' });
    assert.equal(first.upsert, true);
    assert.equal(first.update.$set.observer, 'ticketing');
    assert.equal(first.update.$set.position, '42');
    assert.ok(first.update.$set.updatedAt instanceof Date);
    assert.deepEqual(first.update.$unset, { failure: '' });

    const second = operations[1]?.updateOne;
    assert.deepEqual(second.filter, { consumer: 'mails' });
    assert.equal('position' in second.update.$set, false);
    assert.equal(second.update.$set.failure.position, '43');
    assert.equal(second.update.$set.failure.error, 'Error: boom');
    assert.ok(second.update.$set.failure.at instanceof Date);
    assert.equal(second.update.$unset, undefined);
});

test('save with no updates does not touch the collection', async () => {
    const { collection, calls } = fakeCollection();
    const store = new MongoCheckpointStore(() => Promise.resolve(collection));

    await store.save([]);

    assert.equal(calls.length, 0);
});

test('reset sets the position and unsets the failure', async () => {
    const { collection, calls } = fakeCollection();
    const store = new MongoCheckpointStore(() => Promise.resolve(collection));

    await store.reset('tickets', '10');

    const [filter, update] = calls[0]!.args as [Document, Document];
    assert.deepEqual(filter, { consumer: 'tickets' });
    assert.equal(update.$set.position, '10');
    assert.ok(update.$set.updatedAt instanceof Date);
    assert.deepEqual(update.$unset, { failure: '' });
});

test('reset without a position unsets position and failure', async () => {
    const { collection, calls } = fakeCollection();
    const store = new MongoCheckpointStore(() => Promise.resolve(collection));

    await store.reset('tickets');

    const [, update] = calls[0]!.args as [Document, Document];
    assert.equal('position' in update.$set, false);
    assert.deepEqual(update.$unset, { failure: '', position: '' });
});

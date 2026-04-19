import { assertEquals, assertNotEquals, assertRejects } from '@std/assert';
import { MongoClient } from 'mongodb';
import { MongoConnectionManager } from './mongoConnectionManager.ts';

const TEST_URI = 'mongodb://localhost:27017';

type MongoClientLike = {
    connect: MongoClient['connect'];
    close: MongoClient['close'];
    db: MongoClient['db'];
};

type Stubs = {
    connect: { calls: number; impl: () => Promise<void> };
    close: { calls: number };
    db: { calls: { dbName: string }[]; impl: (dbName: string) => unknown };
};

const installStubs = (overrides: Partial<Stubs> = {}): {
    stubs: Stubs;
    restore: () => void;
} => {
    const proto = MongoClient.prototype as unknown as MongoClientLike;
    const original = {
        connect: proto.connect,
        close: proto.close,
        db: proto.db,
    };

    const stubs: Stubs = {
        connect: {
            calls: 0,
            impl: overrides.connect?.impl ?? (() => Promise.resolve()),
        },
        close: { calls: 0 },
        db: {
            calls: [],
            impl: overrides.db?.impl ?? (() => ({})),
        },
    };

    proto.connect = (async function (this: MongoClient) {
        stubs.connect.calls += 1;
        await stubs.connect.impl();
        return this;
    }) as MongoClient['connect'];

    proto.close = (function () {
        stubs.close.calls += 1;
        return Promise.resolve();
    }) as MongoClient['close'];

    proto.db = (function (dbName: string) {
        stubs.db.calls.push({ dbName });
        return stubs.db.impl(dbName);
    }) as MongoClient['db'];

    return {
        stubs,
        restore: () => {
            proto.connect = original.connect;
            proto.close = original.close;
            proto.db = original.db;
        },
    };
};

const resetSingleton = () => {
    (MongoConnectionManager as unknown as { _instance: null })._instance = null;
};

Deno.test('MongoConnectionManager.getInstance returns the same instance for repeated calls', () => {
    resetSingleton();
    const a = MongoConnectionManager.getInstance(TEST_URI);
    const b = MongoConnectionManager.getInstance(
        'mongodb://other:27017',
        { appName: 'other' },
    );

    assertEquals(a, b);
});

Deno.test('MongoConnectionManager.getClient connects only once across sequential calls', async () => {
    resetSingleton();
    const { stubs, restore } = installStubs();

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const c1 = await manager.getClient();
        const c2 = await manager.getClient();

        assertEquals(stubs.connect.calls, 1);
        assertEquals(c1, c2);
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.getClient connects only once across concurrent calls', async () => {
    resetSingleton();
    let resolveConnect: (() => void) | null = null;
    const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve;
    });

    const { stubs, restore } = installStubs({
        connect: { calls: 0, impl: () => connectPromise },
    });

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const pending = Promise.all([
            manager.getClient(),
            manager.getClient(),
            manager.getClient(),
        ]);

        resolveConnect!();
        const [c1, c2, c3] = await pending;

        assertEquals(stubs.connect.calls, 1);
        assertEquals(c1, c2);
        assertEquals(c2, c3);
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.getClient propagates connection errors and allows retry', async () => {
    resetSingleton();
    let attempt = 0;
    const { stubs, restore } = installStubs({
        connect: {
            calls: 0,
            impl: () => {
                attempt += 1;
                if (attempt === 1) {
                    return Promise.reject(new Error('boom'));
                }
                return Promise.resolve();
            },
        },
    });

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);

        await assertRejects(() => manager.getClient(), Error, 'boom');
        await manager.getClient();

        assertEquals(stubs.connect.calls, 2);
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.getDatabase delegates to the cached client', async () => {
    resetSingleton();
    const fakeDb = { name: 'my-db' };
    const { stubs, restore } = installStubs({
        db: { calls: [], impl: () => fakeDb },
    });

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const db = await manager.getDatabase('my-db');

        assertEquals(stubs.connect.calls, 1);
        assertEquals(stubs.db.calls, [{ dbName: 'my-db' }]);
        assertEquals(db as unknown, fakeDb);
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.getCollection delegates to the cached client', async () => {
    resetSingleton();
    const collectionCalls: string[] = [];
    const fakeCollection = { name: 'users' };
    const fakeDb = {
        collection(name: string) {
            collectionCalls.push(name);
            return fakeCollection;
        },
    };

    const { stubs, restore } = installStubs({
        db: { calls: [], impl: () => fakeDb },
    });

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const col = await manager.getCollection('my-db', 'users');

        assertEquals(stubs.db.calls, [{ dbName: 'my-db' }]);
        assertEquals(collectionCalls, ['users']);
        assertEquals(col as unknown, fakeCollection);
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.healthCheck returns healthy when ping succeeds', async () => {
    resetSingleton();
    const fakeDb = {
        command: (_cmd: unknown) => Promise.resolve({ ok: 1 }),
    };

    const { restore } = installStubs({
        db: { calls: [], impl: () => fakeDb },
    });

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const result = await manager.healthCheck();

        assertEquals(result, { status: 'healthy' });
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.healthCheck returns error details when ping fails', async () => {
    resetSingleton();
    const fakeDb = {
        command: () => Promise.reject(new Error('ping failed')),
    };

    const { restore } = installStubs({
        db: { calls: [], impl: () => fakeDb },
    });

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const result = await manager.healthCheck();

        assertEquals(result.status, 'error');
        assertEquals(result.details, 'ping failed');
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.close drains the pool and triggers a fresh connect on next getClient', async () => {
    resetSingleton();
    const { stubs, restore } = installStubs();

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        const first = await manager.getClient();
        await manager.close();

        assertEquals(stubs.close.calls, 1);

        const second = await manager.getClient();

        assertEquals(stubs.connect.calls, 2);
        assertNotEquals(first, second);
    } finally {
        restore();
    }
});

Deno.test('MongoConnectionManager.close is a no-op when no client has been created', async () => {
    resetSingleton();
    const { stubs, restore } = installStubs();

    try {
        const manager = MongoConnectionManager.getInstance(TEST_URI);
        await manager.close();

        assertEquals(stubs.close.calls, 0);
        assertEquals(stubs.connect.calls, 0);
    } finally {
        restore();
    }
});

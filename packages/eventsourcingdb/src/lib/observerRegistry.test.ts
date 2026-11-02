import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EventObserverHandle } from './eventObserver.ts';
import {
    getEventObserver,
    listEventObservers,
    registerEventObserver,
} from './observerRegistry.ts';

const handle = (name: string): EventObserverHandle => {
    return {
        name,
        subject: `/${name}`,
        status: () => {
            return { name, subject: `/${name}`, phase: 'live', consumers: [] };
        },
        healthCheck: () => {
            return { status: 'healthy' };
        },
    };
};

test('getEventObserver throws for an unknown observer', () => {
    assert.throws(
        () => getEventObserver('registry-unknown'),
        /Event observer "registry-unknown" has not been started/,
    );
});

test('registered observers can be looked up and listed in order', () => {
    const first = handle('registry-first');
    const second = handle('registry-second');

    registerEventObserver(first);
    registerEventObserver(second);

    assert.equal(getEventObserver('registry-first'), first);
    assert.deepEqual(
        listEventObservers()
            .map((observer) => {
                return observer.name;
            })
            .filter((name) => {
                return name.startsWith('registry-');
            }),
        ['registry-first', 'registry-second'],
    );
});

test('registering the same name twice throws', () => {
    registerEventObserver(handle('registry-duplicate'));

    assert.throws(
        () => registerEventObserver(handle('registry-duplicate')),
        /"registry-duplicate" is already running/,
    );
});

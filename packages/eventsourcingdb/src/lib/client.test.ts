import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GenericException } from '@nimbus-cqrs/core';
import { getEventSourcingDBClient } from './client.ts';

test('getEventSourcingDBClient throws GenericException before init', () => {
    assert.throws(() => {
        getEventSourcingDBClient();
    }, GenericException);
});

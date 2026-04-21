import { assertInstanceOf, assertThrows } from '@std/assert';
import { GenericException } from '@nimbus-cqrs/core';
import { getEventSourcingDBClient } from './client.ts';

Deno.test('getEventSourcingDBClient throws GenericException before init', () => {
    const error = assertThrows(() => {
        getEventSourcingDBClient();
    });

    assertInstanceOf(error, GenericException);
});

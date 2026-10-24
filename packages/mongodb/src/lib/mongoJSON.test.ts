import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoJSON } from './mongoJSON.ts';

test('MongoJSON.parse - with ObjectId', () => {
    const input = '{"_id": "objectId::507f1f77bcf86cd799439011"}';

    const result = MongoJSON.parse(input);

    assert.deepEqual(result._id.toString(), '507f1f77bcf86cd799439011');
});

test('MongoJSON.parse - with Date', () => {
    const input = '{"createdAt": "date::2023-01-01T00:00:00Z"}';

    const result = MongoJSON.parse(input);

    assert.ok(result.createdAt instanceof Date);
    assert.deepEqual(
        result.createdAt.toISOString(),
        '2023-01-01T00:00:00.000Z',
    );
});

test('MongoJSON.parse - with Integer', () => {
    const input = '{"age": "int::30"}';

    const result = MongoJSON.parse(input);

    assert.deepEqual(result.age, 30);
});

test('MongoJSON.parse - with Double', () => {
    const input = '{"price": "double::19.99"}';

    const result = MongoJSON.parse(input);

    assert.deepEqual(result.price, 19.99);
});

test('MongoJSON.parse - with String', () => {
    const input = '{"name": "John Doe"}';

    const result = MongoJSON.parse(input);

    assert.deepEqual(result.name, 'John Doe');
});

test('MongoJSON.parse - with Blacklisted Operator', () => {
    const input = '{"$where": "this.age == 30"}';

    assert.throws(() => MongoJSON.parse(input), {
        message: /Operator '\$where' is not allowed/,
    });
});

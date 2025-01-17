import { assertEquals, assertInstanceOf, assertThrows } from '@std/assert';
import { MongoJSON } from './mongoJSON.ts';

Deno.test('MongoJSON.parse - with ObjectId', () => {
    const input = '{"_id": "objectId::507f1f77bcf86cd799439011"}';

    const result = MongoJSON.parse(input);

    assertEquals(result._id.toString(), '507f1f77bcf86cd799439011');
});

Deno.test('MongoJSON.parse - with Date', () => {
    const input = '{"createdAt": "date::2023-01-01T00:00:00Z"}';

    const result = MongoJSON.parse(input);

    assertInstanceOf(result.createdAt, Date);
    assertEquals(result.createdAt.toISOString(), '2023-01-01T00:00:00.000Z');
});

Deno.test('MongoJSON.parse - with Integer', () => {
    const input = '{"age": "int::30"}';

    const result = MongoJSON.parse(input);

    assertEquals(result.age, 30);
});

Deno.test('MongoJSON.parse - with Double', () => {
    const input = '{"price": "double::19.99"}';

    const result = MongoJSON.parse(input);

    assertEquals(result.price, 19.99);
});

Deno.test('MongoJSON.parse - with String', () => {
    const input = '{"name": "John Doe"}';

    const result = MongoJSON.parse(input);

    assertEquals(result.name, 'John Doe');
});

Deno.test('MongoJSON.parse - with Blacklisted Operator', () => {
    const input = '{"$where": "this.age == 30"}';

    assertThrows(
        () => MongoJSON.parse(input),
        Error,
        "Operator '$where' is not allowed",
    );
});

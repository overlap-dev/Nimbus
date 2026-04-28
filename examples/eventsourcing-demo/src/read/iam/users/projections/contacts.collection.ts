import { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';
import { z } from 'zod';

// For demo purposes we define a second projection for contacts.

export const Contact = z.object({
    _id: z.string().length(24),
    id: z.string(),
    revision: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
});
export type Contact = z.infer<typeof Contact>;

export const CONTACTS_COLLECTION: MongoCollectionDefinition = {
    name: 'contacts',
    options: {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: [
                    'id',
                    'revision',
                    'email',
                    'firstName',
                    'lastName',
                ],
                properties: {
                    id: {
                        bsonType: 'string',
                    },
                    revision: {
                        bsonType: 'string',
                    },
                    email: {
                        bsonType: 'string',
                    },
                    firstName: {
                        bsonType: 'string',
                    },
                    lastName: {
                        bsonType: 'string',
                    },
                },
            },
        },
    },
    indexes: [
        { key: { id: 1 }, unique: true },
        { key: { revision: 1 } },
    ],
};

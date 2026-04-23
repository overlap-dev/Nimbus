import { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';
import { z } from 'zod';

export const User = z.object({
    _id: z.string().length(24),
    id: z.string(),
    revision: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    invitedAt: z.string(),
    acceptedAt: z.string().nullable(),
});
export type User = z.infer<typeof User>;

export const USERS_COLLECTION: MongoCollectionDefinition = {
    name: 'users',
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
                    'invitedAt',
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
                    invitedAt: {
                        bsonType: 'date',
                    },
                    acceptedAt: {
                        bsonType: ['date', 'null'],
                    },
                },
            },
        },
    },
    indexes: [
        { key: { id: 1 }, unique: true },
        { key: { revision: 1 } },
        { key: { acceptedAt: 1 } },
    ],
};

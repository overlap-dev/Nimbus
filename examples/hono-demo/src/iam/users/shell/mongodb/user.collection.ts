import { MongoCollectionDefinition } from '@nimbus/mongodb';

export const USERS_COLLECTION: MongoCollectionDefinition = {
    name: 'users',
    options: {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: [
                    'email',
                    'firstName',
                    'lastName',
                    'group',
                    'createdAt',
                    'updatedAt',
                ],
                properties: {
                    email: {
                        bsonType: 'string',
                    },
                    firstName: {
                        bsonType: 'string',
                    },
                    lastName: {
                        bsonType: 'string',
                    },
                    group: {
                        bsonType: 'string',
                    },
                    createdAt: {
                        bsonType: 'date',
                    },
                    updatedAt: {
                        bsonType: 'date',
                    },
                },
            },
        },
    },
    indexes: [
        { key: { email: 1 }, unique: true },
        { key: { firstName: 1 } },
        { key: { lastName: 1 } },
        { key: { group: 1 } },
        { key: { createdAt: 1 } },
        { key: { updatedAt: 1 } },
    ],
};

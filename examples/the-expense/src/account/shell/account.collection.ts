import { MongoCollectionDefinition } from '@nimbus/mongodb';

export const ACCOUNT_COLLECTION: MongoCollectionDefinition = {
    name: 'accounts',
    options: {
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: [
                    'name',
                    'status',
                ],
                properties: {
                    name: {
                        bsonType: 'string',
                    },
                    status: {
                        bsonType: 'string',
                        enum: ['active', 'archived'],
                    },
                },
            },
        },
    },
    indexes: [
        { key: { name: 1 }, unique: true },
        { key: { status: 1 } },
    ],
};

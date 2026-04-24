import { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';
import { z } from 'zod';

// Here we define the type of a user document and the
// structure of the MongoDB collection.

export const User = z.object({
    _id: z.string().length(24),
    id: z.string(),

    // The revision is an important bit of
    // information. We set the latest event id
    // from the EventSourcingDB related to this user
    // here.
    // This is used to resume the projection if the
    // application is restarted. We do not want to
    // apply all events again but pick up where we left off.
    //
    // See also getUserProjectionLowerBound() in users.projection.ts
    // for additional details on this.
    //
    // TODO: Should we make this part of Nimbus with a type or interface?
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

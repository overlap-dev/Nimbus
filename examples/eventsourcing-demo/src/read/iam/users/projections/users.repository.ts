import { getEnv } from '@nimbus-cqrs/core';
import {
    getMongoConnectionManager,
    MongoDBRepository,
    updateOne,
} from '@nimbus-cqrs/mongodb';
import { type Document, ObjectId } from 'mongodb';
import { USERS_COLLECTION, User } from './users.collection.ts';

class UserRepository extends MongoDBRepository<User> {
    constructor() {
        const env = getEnv({ variables: ['MONGO_DB'] });

        super(
            () => {
                return getMongoConnectionManager().getCollection(
                    env.MONGO_DB,
                    USERS_COLLECTION.name,
                );
            },
            User,
            'User',
        );
    }

    override _mapDocumentToEntity(doc: Document): User {
        return User.parse({
            _id: doc._id.toString(),
            id: doc.id,
            revision: doc.revision,
            email: doc.email,
            firstName: doc.firstName,
            lastName: doc.lastName,
            invitedAt: doc.invitedAt.toISOString(),
            acceptedAt: doc.acceptedAt?.toISOString() ?? null,
        });
    }

    override _mapEntityToDocument(user: User): Document {
        return {
            _id: new ObjectId(user._id),
            id: user.id,
            revision: user.revision,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            invitedAt: new Date(user.invitedAt),
            acceptedAt: user.acceptedAt ? new Date(user.acceptedAt) : null,
        };
    }

    // Inserts the user only if there is no user with the same id yet.
    // The projection uses this to stay idempotent. Applying the same
    // event twice still results in one single document.
    public async insertOnce(user: User): Promise<void> {
        const collection = await this._getCollection();

        await updateOne({
            collection,
            filter: { id: user.id },
            update: { $setOnInsert: this._mapEntityToDocument(user) },
            options: { upsert: true },
        });
    }
}

export const userRepository = new UserRepository();

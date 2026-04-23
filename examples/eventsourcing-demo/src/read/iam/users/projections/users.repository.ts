import { MongoDBRepository } from '@nimbus-cqrs/mongodb';
import { getEnv } from '@nimbus-cqrs/utils';
import { Document, ObjectId } from 'mongodb';
import { mongoManager } from '../../../../mongodb.ts';
import { User, USERS_COLLECTION } from './users.collection.ts';

class UserRepository extends MongoDBRepository<User> {
    constructor() {
        const env = getEnv({ variables: ['MONGO_DB'] });

        super(
            () => {
                return mongoManager.getCollection(
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

    public async getLastProjectedEventId(): Promise<string> {
        const users = await this.find({
            filter: {},
            limit: 1,
            skip: 0,
            sort: { revision: -1 },
        });

        return users[0]?.revision ?? '0';
    }
}

export const userRepository = new UserRepository();

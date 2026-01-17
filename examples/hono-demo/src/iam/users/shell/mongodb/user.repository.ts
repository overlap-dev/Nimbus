import { MongoDBRepository } from '@nimbus/mongodb';
import { getEnv } from '@nimbus/utils';
import { Document, ObjectId } from 'mongodb';
import { mongoManager } from '../../../../shared/shell/mongodb.ts';
import { User } from '../../core/domain/user.ts';
import { USERS_COLLECTION } from './user.collection.ts';

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
            email: doc.email,
            firstName: doc.firstName,
            lastName: doc.lastName,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        });
    }

    override _mapEntityToDocument(user: User): Document {
        return {
            _id: new ObjectId(user._id),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
        };
    }
}

export const userRepository = new UserRepository();

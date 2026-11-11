import { getEnv } from '@nimbus-cqrs/core';
import {
    getMongoConnectionManager,
    type MongoCollectionDefinition,
} from '@nimbus-cqrs/mongodb';
import type { Collection, Document } from 'mongodb';

/**
 * Collection factory to load a certain collection
 * used on `MongoDBRepository` constructors.
 */
export const getMongoCollection = (
    definition: MongoCollectionDefinition,
): (() => Promise<Collection<Document>>) => {
    return async () => {
        const env = getEnv({ variables: ['MONGO_DB'] });

        return await getMongoConnectionManager('default').getCollection(
            env.MONGO_DB,
            definition.name,
        );
    };
};

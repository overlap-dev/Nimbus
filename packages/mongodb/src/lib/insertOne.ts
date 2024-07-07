import { Exception } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import {
    Document,
    InsertOneOptions,
    InsertOneResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

export type InsertOneInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    document: OptionalUnlessRequiredId<Document>;
    options?: InsertOneOptions;
};

export type InsertOne = (
    input: InsertOneInput,
) => Promise<E.Either<Exception, InsertOneResult<Document>>>;

export const insertOne: InsertOne = async ({
    mongoUrl,
    database,
    collectionName,
    document,
    options,
}) => {
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const res = await mongoClient
            .db(database)
            .collection(collectionName)
            .insertOne(document, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

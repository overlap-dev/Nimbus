import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Document,
    InsertOneOptions,
    InsertOneResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

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

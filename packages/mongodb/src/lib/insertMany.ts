import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    BulkWriteOptions,
    Document,
    InsertManyResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type InsertManyInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    documents: OptionalUnlessRequiredId<Document>[];
    options?: BulkWriteOptions;
};

export type InsertMany = (
    input: InsertManyInput,
) => Promise<E.Either<Exception, InsertManyResult<Document>>>;

export const insertMany: InsertMany = async ({
    mongoUrl,
    database,
    collectionName,
    documents,
    options,
}) => {
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const res = await mongoClient
            .db(database)
            .collection(collectionName)
            .insertMany(documents, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

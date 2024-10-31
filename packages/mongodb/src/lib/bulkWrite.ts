import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    AnyBulkWriteOperation,
    BulkWriteOptions,
    BulkWriteResult,
    Document,
} from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type BulkWriteInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    operations: AnyBulkWriteOperation<Document>[];
    options?: BulkWriteOptions;
};

export type BulkWrite = (
    input: BulkWriteInput,
) => Promise<E.Either<Exception, BulkWriteResult>>;

export const bulkWrite: BulkWrite = async ({
    mongoUrl,
    database,
    collectionName,
    operations,
    options,
}) => {
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const res = await mongoClient
            .db(database)
            .collection(collectionName)
            .bulkWrite(operations, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

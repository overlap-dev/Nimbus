import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    AnyBulkWriteOperation,
    BulkWriteOptions,
    BulkWriteResult,
    Collection,
    Document,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type BulkWriteInput = {
    collection: Collection<Document>;
    operations: AnyBulkWriteOperation<Document>[];
    options?: BulkWriteOptions;
};

export type BulkWrite = (
    input: BulkWriteInput,
) => Promise<E.Either<Exception, BulkWriteResult>>;

export const bulkWrite: BulkWrite = async ({
    collection,
    operations,
    options,
}) => {
    try {
        const res = await collection.bulkWrite(operations, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

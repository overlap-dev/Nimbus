import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    BulkWriteOptions,
    Collection,
    Document,
    InsertManyResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type InsertManyInput = {
    collection: Collection<Document>;
    documents: OptionalUnlessRequiredId<Document>[];
    options?: BulkWriteOptions;
};

export type InsertMany = (
    input: InsertManyInput,
) => Promise<E.Either<Exception, InsertManyResult<Document>>>;

export const insertMany: InsertMany = async ({
    collection,
    documents,
    options,
}) => {
    try {
        const res = await collection.insertMany(documents, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

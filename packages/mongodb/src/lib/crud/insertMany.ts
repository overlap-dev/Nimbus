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
) => Promise<InsertManyResult<Document>>;

/**
 * Inserts multiple documents into a MongoDB collection.
 *
 * @param {InsertManyInput} input - The input object.
 * @param input.collection - The collection to insert into.
 * @param input.documents - The documents to insert.
 * @param [input.options] - The insert options.
 *
 * @returns {Promise<InsertManyResult<Document>} The result of the insert operation.
 */
export const insertMany: InsertMany = async ({
    collection,
    documents,
    options,
}) => {
    try {
        const res = await collection.insertMany(documents, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

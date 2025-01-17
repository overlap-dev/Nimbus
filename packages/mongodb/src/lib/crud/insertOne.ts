import type {
    Collection,
    Document,
    InsertOneOptions,
    InsertOneResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type InsertOneInput = {
    collection: Collection<Document>;
    document: OptionalUnlessRequiredId<Document>;
    options?: InsertOneOptions;
};

export type InsertOne = (
    input: InsertOneInput,
) => Promise<InsertOneResult<Document>>;

/**
 * Inserts a single document into a MongoDB collection.
 *
 * @param {InsertOneInput} input - The input object.
 * @param input.collection - The collection to insert into.
 * @param input.document - The document to insert.
 * @param [input.options] - The insert options.
 *
 * @returns {Promise<InsertOneResult<Document>} The result of the insert operation.
 */
export const insertOne: InsertOne = async ({
    collection,
    document,
    options,
}) => {
    try {
        const res = await collection.insertOne(document, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

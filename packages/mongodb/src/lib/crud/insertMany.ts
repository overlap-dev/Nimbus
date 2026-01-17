import type {
    BulkWriteOptions,
    Collection,
    Document,
    InsertManyResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';
import { withSpan } from '../tracing.ts';

/**
 * Type to define the input for the insertMany function.
 */
export type InsertManyInput = {
    collection: Collection<Document>;
    documents: OptionalUnlessRequiredId<Document>[];
    options?: BulkWriteOptions;
};

/**
 * Type to define the insertMany function.
 */
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
export const insertMany: InsertMany = ({
    collection,
    documents,
    options,
}) => {
    return withSpan('insertMany', collection, async () => {
        try {
            return await collection.insertMany(documents, options);
        } catch (error) {
            throw handleMongoError(error);
        }
    });
};

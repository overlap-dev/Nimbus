import type {
    AnyBulkWriteOperation,
    BulkWriteOptions,
    BulkWriteResult,
    Collection,
    Document,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the bulkWrite function.
 */
export type BulkWriteInput = {
    collection: Collection<Document>;
    operations: AnyBulkWriteOperation<Document>[];
    options?: BulkWriteOptions;
};

/**
 * Type to define the bulkWrite function.
 */
export type BulkWrite = (
    input: BulkWriteInput,
) => Promise<BulkWriteResult>;

/**
 * Perform multiple write operations in bulk.
 *
 * @param {BulkWriteInput} input - The input object.
 * @param input.collection - The collection to write to.
 * @param input.operations - The write operations to perform.
 * @param [input.options] - The bulk write options.
 *
 * @returns {Promise<BulkWriteResult>} The result of the bulk write operation.
 */
export const bulkWrite: BulkWrite = async ({
    collection,
    operations,
    options,
}) => {
    try {
        const res = await collection.bulkWrite(operations, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

import type {
    Collection,
    CountDocumentsOptions,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type CountDocumentsInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: CountDocumentsOptions;
};

export type CountDocuments = (
    input: CountDocumentsInput,
) => Promise<number>;

/**
 * Count the number of documents in a MongoDB collection.
 *
 * @param {CountDocumentsInput} input - The input object.
 * @param input.collection - The collection to count documents in.
 * @param input.filter - The filter for the count operation.
 * @param [input.options] - The count options.
 *
 * @returns {Promise<number>} The number of documents.
 */
export const countDocuments: CountDocuments = async ({
    collection,
    filter,
    options,
}) => {
    try {
        const res = await collection.countDocuments(filter, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

import type {
    Collection,
    CountDocumentsOptions,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';
import { withSpan } from '../tracing.ts';

/**
 * Type to define the input for the countDocuments function.
 */
export type CountDocumentsInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: CountDocumentsOptions;
};

/**
 * Type to define the countDocuments function.
 */
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
export const countDocuments: CountDocuments = ({
    collection,
    filter,
    options,
}) => {
    return withSpan('countDocuments', collection, async () => {
        try {
            return await collection.countDocuments(filter, options);
        } catch (error) {
            throw handleMongoError(error);
        }
    });
};

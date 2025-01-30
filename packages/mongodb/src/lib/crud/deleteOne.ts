import type {
    Collection,
    DeleteOptions,
    DeleteResult,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the deleteOne function.
 */
export type DeleteOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

/**
 * Type to define the deleteOne function.
 */
export type DeleteOne = (
    input: DeleteOneInput,
) => Promise<DeleteResult>;

/**
 * Deletes a single document from a MongoDB collection.
 *
 * @param {DeleteOneInput} input - The input object.
 * @param input.collection - The collection to delete from.
 * @param input.filter - The filter for the delete operation.
 * @param [input.options] - The delete options.
 *
 * @returns {Promise<DeleteResult>} The result of the delete operation.
 */
export const deleteOne: DeleteOne = async ({
    collection,
    filter,
    options,
}) => {
    try {
        const res = await collection.deleteOne(filter, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

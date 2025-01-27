import type {
    Collection,
    DeleteOptions,
    DeleteResult,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type DeleteManyInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

export type DeleteMany = (
    input: DeleteManyInput,
) => Promise<DeleteResult>;

/**
 * Deletes multiple documents from a MongoDB collection.
 *
 * @param {DeleteManyInput} input - The input object.
 * @param input.collection - The collection to delete from.
 * @param input.filter - The filter for the delete operation.
 * @param [input.options] - The delete options.
 *
 * @returns {Promise<DeleteResult>} The result of the delete operation.
 */
export const deleteMany: DeleteMany = async ({
    collection,
    filter,
    options,
}) => {
    try {
        const res = await collection.deleteMany(filter, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

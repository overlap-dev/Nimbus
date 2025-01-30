import type {
    Collection,
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the updateMany function.
 */
export type UpdateManyInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    update: UpdateFilter<Document>;
    options?: UpdateOptions;
};

/**
 * Type to define the updateMany function.
 */
export type UpdateMany = (
    input: UpdateManyInput,
) => Promise<UpdateResult<Document>>;

/**
 * Updates multiple documents in a MongoDB collection.
 *
 * @param {UpdateManyInput} input - The input object.
 * @param input.collection - The collection to update in.
 * @param input.filter - The filter for the update operation.
 * @param input.update - The update object.
 * @param [input.options] - The update options.
 *
 * @returns {Promise<UpdateResult<Document>} The result of the update operation.
 */
export const updateMany: UpdateMany = async ({
    collection,
    filter,
    update,
    options,
}) => {
    try {
        const res = await collection.updateMany(filter, update, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

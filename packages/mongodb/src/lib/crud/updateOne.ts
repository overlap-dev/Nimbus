import type {
    Collection,
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type UpdateOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    update: UpdateFilter<Document> | Document[];
    options?: UpdateOptions;
};

export type UpdateOne = (
    input: UpdateOneInput,
) => Promise<UpdateResult<Document>>;

/**
 * Updates a single document in a MongoDB collection.
 *
 * @param {UpdateOneInput} input - The input object.
 * @param input.collection - The collection to update in.
 * @param input.filter - The filter for the update operation.
 * @param input.update - The update object.
 * @param [input.options] - The update options.
 *
 * @returns {Promise<UpdateResult<Document>} The result of the update operation.
 */
export const updateOne: UpdateOne = async ({
    collection,
    filter,
    update,
    options,
}) => {
    try {
        const res = await collection.updateOne(filter, update, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

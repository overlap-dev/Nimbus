import type {
    Collection,
    Document,
    Filter,
    ReplaceOptions,
    UpdateResult,
    WithoutId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type ReplaceOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    replacement: WithoutId<Document>;
    options?: ReplaceOptions;
};

export type ReplaceOne = (
    input: ReplaceOneInput,
) => Promise<Document | UpdateResult<Document>>;

/**
 * Replaces a single document in a MongoDB collection.
 *
 * @param {ReplaceOneInput} input - The input object.
 * @param input.collection - The collection to replace in.
 * @param input.filter - The filter for the replace operation.
 * @param input.replacement - The replacement document.
 * @param [input.options] - The replace options.
 *
 * @returns {Promise<Document | UpdateResult<Document>} The result of the replace operation.
 */
export const replaceOne: ReplaceOne = async ({
    collection,
    filter,
    replacement,
    options,
}) => {
    try {
        const res = await collection.replaceOne(filter, replacement, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

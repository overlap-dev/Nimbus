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

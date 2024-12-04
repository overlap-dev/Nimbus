import type {
    Collection,
    DeleteOptions,
    DeleteResult,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type DeleteOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

export type DeleteOne = (
    input: DeleteOneInput,
) => Promise<DeleteResult>;

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

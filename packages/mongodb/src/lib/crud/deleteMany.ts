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

import type {
    Collection,
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type UpdateManyInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    update: UpdateFilter<Document>;
    options?: UpdateOptions;
};

export type UpdateMany = (
    input: UpdateManyInput,
) => Promise<UpdateResult<Document>>;

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

import type {
    Collection,
    CountDocumentsOptions,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type CountDocumentsInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: CountDocumentsOptions;
};

export type CountDocuments = (
    input: CountDocumentsInput,
) => Promise<number>;

export const countDocuments: CountDocuments = async ({
    collection,
    filter,
    options,
}) => {
    try {
        const res = await collection.countDocuments(filter, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

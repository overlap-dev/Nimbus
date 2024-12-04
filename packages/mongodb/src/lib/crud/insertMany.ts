import type {
    BulkWriteOptions,
    Collection,
    Document,
    InsertManyResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type InsertManyInput = {
    collection: Collection<Document>;
    documents: OptionalUnlessRequiredId<Document>[];
    options?: BulkWriteOptions;
};

export type InsertMany = (
    input: InsertManyInput,
) => Promise<InsertManyResult<Document>>;

export const insertMany: InsertMany = async ({
    collection,
    documents,
    options,
}) => {
    try {
        const res = await collection.insertMany(documents, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

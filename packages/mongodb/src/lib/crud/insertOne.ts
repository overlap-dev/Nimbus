import type {
    Collection,
    Document,
    InsertOneOptions,
    InsertOneResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type InsertOneInput = {
    collection: Collection<Document>;
    document: OptionalUnlessRequiredId<Document>;
    options?: InsertOneOptions;
};

export type InsertOne = (
    input: InsertOneInput,
) => Promise<InsertOneResult<Document>>;

export const insertOne: InsertOne = async ({
    collection,
    document,
    options,
}) => {
    try {
        const res = await collection.insertOne(document, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

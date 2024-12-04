import type {
    AnyBulkWriteOperation,
    BulkWriteOptions,
    BulkWriteResult,
    Collection,
    Document,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type BulkWriteInput = {
    collection: Collection<Document>;
    operations: AnyBulkWriteOperation<Document>[];
    options?: BulkWriteOptions;
};

export type BulkWrite = (
    input: BulkWriteInput,
) => Promise<BulkWriteResult>;

export const bulkWrite: BulkWrite = async ({
    collection,
    operations,
    options,
}) => {
    try {
        const res = await collection.bulkWrite(operations, options);
        return res;
    } catch (error) {
        throw handleMongoError(error);
    }
};

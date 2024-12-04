import { GenericException, NotFoundException } from '@nimbus/core';
import type {
    Collection,
    Document,
    Filter,
    FindOneAndUpdateOptions,
    UpdateFilter,
    WithId,
} from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

export type FindOneAndUpdate<TData> = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    update: UpdateFilter<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOneAndUpdateOptions;
};

export type FindOneUpdate = <TData>(
    input: FindOneAndUpdate<TData>,
) => Promise<TData>;

export const findOneAndUpdate: FindOneUpdate = async ({
    collection,
    filter,
    update,
    mapDocument,
    outputType,
    options,
}) => {
    let res: WithId<Document> | null = null;

    try {
        if (options) {
            res = await collection.findOneAndUpdate(filter, update, options);
        } else {
            res = await collection.findOneAndUpdate(filter, update);
        }
    } catch (error) {
        throw handleMongoError(error);
    }

    if (!res) {
        throw new NotFoundException('Document not found');
    }

    try {
        return outputType.parse(mapDocument(res));
    } catch (error) {
        const exception = error instanceof Error
            ? new GenericException().fromError(error)
            : new GenericException();

        throw exception;
    }
};

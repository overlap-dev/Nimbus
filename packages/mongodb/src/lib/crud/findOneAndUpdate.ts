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

/**
 * Finds a single document in a MongoDB collection, updates it,
 * and returns the result as the specified output type.
 *
 * @param {FindOneAndUpdate} input - The input object.
 * @param input.collection - The collection to find and update in.
 * @param input.filter - The filter for the find operation.
 * @param input.update - The update filter.
 * @param input.mapDocument - The function to map the document to the output type.
 * @param input.outputType - The output zod type.
 * @param [input.options] - MongoDB find and update options.
 *
 * @returns {Promise<TData>} The found and updated document.
 */
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

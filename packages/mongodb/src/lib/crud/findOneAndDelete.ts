import { GenericException, NotFoundException } from '@nimbus/core';
import type {
    Collection,
    Document,
    Filter,
    FindOneAndDeleteOptions,
    WithId,
} from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

export type FindOneAndDelete<TData> = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOneAndDeleteOptions;
};

export type FindOneDelete = <TData>(
    input: FindOneAndDelete<TData>,
) => Promise<TData>;

/**
 * Finds a single document in a MongoDB collection, deletes it,
 * and returns the result as the specified output type.
 *
 * @param {FindOneAndDelete} input - The input object.
 * @param input.collection - The collection to find and delete from.
 * @param input.filter - The filter for the find operation.
 * @param input.mapDocument - The function to map the document to the output type.
 * @param input.outputType - The output zod type.
 * @param [input.options] - MongoDB find and delete options.
 *
 * @returns {Promise<TData>} The found and deleted document.
 */
export const findOneAndDelete: FindOneDelete = async ({
    collection,
    filter,
    mapDocument,
    outputType,
    options,
}) => {
    let res: WithId<Document> | null = null;

    try {
        if (options) {
            res = await collection.findOneAndDelete(filter, options);
        } else {
            res = await collection.findOneAndDelete(filter);
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

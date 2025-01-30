import { GenericException, NotFoundException } from '@nimbus/core';
import type {
    Collection,
    Document,
    Filter,
    FindOneAndReplaceOptions,
    WithId,
    WithoutId,
} from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the findOneAndReplace function.
 */
export type FindOneAndReplaceInput<TData> = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    replacement: WithoutId<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOneAndReplaceOptions;
};

/**
 * Type to define the findOneAndReplace function.
 */
export type FindOneAndReplace = <TData>(
    input: FindOneAndReplaceInput<TData>,
) => Promise<TData>;

/**
 * Finds a single document in a MongoDB collection, replaces it,
 * and returns the result as the specified output type.
 *
 * @param {FindOneAndReplaceInput} input - The input object.
 * @param input.collection - The collection to find and replace in.
 * @param input.filter - The filter for the find operation.
 * @param input.replacement - The replacement document.
 * @param input.mapDocument - The function to map the document to the output type.
 * @param input.outputType - The output zod type.
 * @param [input.options] - MongoDB find and replace options.
 *
 * @returns {Promise<TData>} The found and replaced document.
 */
export const findOneAndReplace: FindOneAndReplace = async ({
    collection,
    filter,
    replacement,
    mapDocument,
    outputType,
    options,
}) => {
    let res: WithId<Document> | null = null;

    try {
        if (options) {
            res = await collection.findOneAndReplace(
                filter,
                replacement,
                options,
            );
        } else {
            res = await collection.findOneAndReplace(filter, replacement);
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

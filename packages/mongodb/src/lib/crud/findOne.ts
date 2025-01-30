import { GenericException, NotFoundException } from '@nimbus/core';
import type { Collection, Document, Filter, WithId } from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the findOne function.
 */
export type FindOneInput<TData> = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
};

/**
 * Type to define the findOne function.
 */
export type FindOne = <TData>(
    input: FindOneInput<TData>,
) => Promise<TData>;

/**
 * Finds a single document in a MongoDB collection and returns
 * the result as the specified output type.
 *
 * @param {FindOneInput} input - The input object.
 * @param input.collection - The collection to find documents in.
 * @param input.filter - The filter for the find operation.
 * @param input.mapDocument - The function to map the document to the output type.
 * @param input.outputType - The output zod type.
 *
 * @returns {Promise<TData>} The found document.
 */
export const findOne: FindOne = async ({
    collection,
    filter,
    mapDocument,
    outputType,
}) => {
    let res: WithId<Document> | null = null;

    try {
        res = await collection.findOne(filter);
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

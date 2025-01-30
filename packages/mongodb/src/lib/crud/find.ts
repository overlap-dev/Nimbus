import { GenericException } from '@nimbus/core';
import type {
    Collection,
    Document,
    Filter,
    FindOptions,
    Sort,
    WithId,
} from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the find function.
 */
export type FindInput<TData> = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    limit?: number;
    skip?: number;
    sort?: Sort;
    project?: Document;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOptions;
};

/**
 * Type to define the find function.
 */
export type Find = <TData>(
    input: FindInput<TData>,
) => Promise<TData[]>;

/**
 * Finds documents in a MongoDB collection and returns
 * the result as an array of the specified output type.
 *
 * @param {FindInput} input - The input object.
 * @param input.collection - The collection to find documents in.
 * @param input.filter - The filter for the find operation.
 * @param [input.limit] - The maximum number of documents to return.
 * @param [input.skip] - The number of documents to skip.
 * @param [input.sort] - The sort order.
 * @param [input.project] - The projection document.
 * @param input.mapDocument - The function to map the documents to the output type.
 * @param input.outputType - The output zod type.
 * @param [input.options] - MongoDB find options.
 *
 * @returns {Promise<TData[]>} The found documents.
 */
export const find: Find = async ({
    collection,
    filter,
    limit,
    skip,
    sort,
    project,
    mapDocument,
    outputType,
    options,
}) => {
    let res: WithId<Document>[] = [];

    try {
        const findRes = collection.find(filter, options);

        if (typeof limit !== 'undefined') {
            findRes.limit(limit);
        }

        if (typeof skip !== 'undefined') {
            findRes.skip(skip);
        }

        if (typeof sort !== 'undefined') {
            findRes.sort(sort);
        }

        if (typeof project !== 'undefined') {
            findRes.project(project);
        }

        res = await findRes.toArray();
    } catch (error) {
        throw handleMongoError(error);
    }

    try {
        return res.map((item) => outputType.parse(mapDocument(item)));
    } catch (error) {
        const exception = error instanceof Error
            ? new GenericException().fromError(error)
            : new GenericException();

        throw exception;
    }
};

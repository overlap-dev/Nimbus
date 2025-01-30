import { GenericException } from '@nimbus/core';
import type { AggregateOptions, Collection, Document } from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

/**
 * Type to define the input for the aggregate function.
 */
export type AggregateInput<TData> = {
    collection: Collection<Document>;
    aggregation: Document[];
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: AggregateOptions;
};

/**
 * Type to define the aggregate function.
 */
export type Aggregate = <TData>(
    input: AggregateInput<TData>,
) => Promise<TData[]>;

/**
 * Aggregates documents in a MongoDB collection and return
 * the result as an array of the specified output type.
 *
 * @param {AggregateInput} input - The input object.
 * @param input.collection - The collection to aggregate.
 * @param input.aggregation - The aggregation pipeline.
 * @param input.mapDocument - The function to map the document to the output type.
 * @param input.outputType - The output zod type.
 * @param [input.options] - MongoDB aggregation options.
 *
 * @returns {Promise<TData[]>} The aggregated documents.
 */
export const aggregate: Aggregate = async ({
    collection,
    aggregation,
    mapDocument,
    outputType,
    options,
}) => {
    let res: Document[] = [];

    try {
        const aggregationRes = collection.aggregate(aggregation, options);
        res = await aggregationRes.toArray();
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

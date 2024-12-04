import { GenericException } from '@nimbus/core';
import type { AggregateOptions, Collection, Document } from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

export type AggregateInput<TData> = {
    collection: Collection<Document>;
    aggregation: Document[];
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: AggregateOptions;
};

export type Aggregate = <TData>(
    input: AggregateInput<TData>,
) => Promise<TData[]>;

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

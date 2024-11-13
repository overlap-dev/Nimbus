import * as E from '@baetheus/fun/either';
import { type Exception, GenericException } from '@nimbus/core';
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
) => Promise<E.Either<Exception, TData[]>>;

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
        return E.left(handleMongoError(error));
    }

    try {
        const result = res.map((item) => outputType.parse(mapDocument(item)));
        return E.right(result);
    } catch (error) {
        const exception = error instanceof Error
            ? new GenericException().fromError(error)
            : new GenericException();

        return E.left(exception);
    }
};

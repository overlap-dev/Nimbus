import * as E from '@baetheus/fun/either';
import { type Exception, GenericException } from '@nimbus/core';
import type { AggregateOptions, Document } from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type AggregateInput<TData> = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    aggregation: Document[];
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: AggregateOptions;
};

export type Aggregate = <TData>(
    input: AggregateInput<TData>,
) => Promise<E.Either<Exception, TData[]>>;

export const aggregate: Aggregate = async ({
    mongoUrl,
    database,
    collectionName,
    aggregation,
    mapDocument,
    outputType,
    options,
}) => {
    let res: Document[] = [];
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const aggregationRes = mongoClient
            .db(database)
            .collection(collectionName)
            .aggregate(aggregation, options);

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

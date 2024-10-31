import { Exception, GenericException } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import { AggregateOptions, Document } from 'mongodb';
import { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

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
        const exception =
            error instanceof Error
                ? new GenericException().fromError(error)
                : new GenericException();

        return E.left(exception);
    }
};

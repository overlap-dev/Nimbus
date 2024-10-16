import { Exception, GenericException } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import { Document, Filter, FindOptions, Sort, WithId } from 'mongodb';
import { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

export type FindInput<TData> = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    limit?: number;
    skip?: number;
    sort?: Sort;
    project?: Document;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOptions;
};

export type Find = <TData>(
    input: FindInput<TData>,
) => Promise<E.Either<Exception, TData[]>>;

export const find: Find = async ({
    mongoUrl,
    database,
    collectionName,
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
        const mongoClient = await getMongoClient(mongoUrl);

        const findRes = mongoClient
            .db(database)
            .collection(collectionName)
            .find(filter, options);

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

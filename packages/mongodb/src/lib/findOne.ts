import * as E from '@baetheus/fun/either';
import {
    type Exception,
    GenericException,
    NotFoundException,
} from '@nimbus/core';
import type { Document, Filter, WithId } from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type FindOneInput<TData> = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
};

export type FindOne = <TData>(
    input: FindOneInput<TData>,
) => Promise<E.Either<Exception, TData>>;

export const findOne: FindOne = async ({
    mongoUrl,
    database,
    collectionName,
    filter,
    mapDocument,
    outputType,
}) => {
    let res: WithId<Document> | null = null;
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        res = await mongoClient
            .db(database)
            .collection(collectionName)
            .findOne(filter);
    } catch (error) {
        return E.left(handleMongoError(error));
    }

    if (!res) {
        return E.left(new NotFoundException('Document not found'));
    }

    try {
        const result = outputType.parse(mapDocument(res));
        return E.right(result);
    } catch (error) {
        const exception = error instanceof Error
            ? new GenericException().fromError(error)
            : new GenericException();

        return E.left(exception);
    }
};

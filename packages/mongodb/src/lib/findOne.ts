import {
    Exception,
    GenericException,
    NotFoundException,
} from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import { Document, Filter, WithId } from 'mongodb';
import { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

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
        const exception =
            error instanceof Error
                ? new GenericException().fromError(error)
                : new GenericException();

        return E.left(exception);
    }
};

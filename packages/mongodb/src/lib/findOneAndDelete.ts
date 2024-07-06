import {
    Exception,
    GenericException,
    NotFoundException,
} from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import { Document, Filter, FindOneAndDeleteOptions, WithId } from 'mongodb';
import { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

export type FindOneAndDelete<TData> = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOneAndDeleteOptions;
};

export type FindOneDelete = <TData>(
    input: FindOneAndDelete<TData>,
) => Promise<E.Either<Exception, TData>>;

export const findOneAndDelete: FindOneDelete = async ({
    mongoUrl,
    database,
    collectionName,
    filter,
    mapDocument,
    outputType,
    options,
}) => {
    let res: WithId<Document> | null = null;
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const collection = mongoClient.db(database).collection(collectionName);

        if (options) {
            res = await collection.findOneAndDelete(filter, options);
        } else {
            res = await collection.findOneAndDelete(filter);
        }
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

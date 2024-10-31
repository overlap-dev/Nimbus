import * as E from '@baetheus/fun/either';
import {
    type Exception,
    GenericException,
    NotFoundException,
} from '@nimbus/core';
import type {
    Document,
    Filter,
    FindOneAndDeleteOptions,
    WithId,
} from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

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
        const exception = error instanceof Error
            ? new GenericException().fromError(error)
            : new GenericException();

        return E.left(exception);
    }
};

import * as E from '@baetheus/fun/either';
import {
    type Exception,
    GenericException,
    NotFoundException,
} from '@nimbus/core';
import type {
    Document,
    Filter,
    FindOneAndReplaceOptions,
    WithId,
    WithoutId,
} from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type FindOneAndReplace<TData> = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    replacement: WithoutId<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
    options?: FindOneAndReplaceOptions;
};

export type FindOneReplace = <TData>(
    input: FindOneAndReplace<TData>,
) => Promise<E.Either<Exception, TData>>;

export const findOneAndReplace: FindOneReplace = async ({
    mongoUrl,
    database,
    collectionName,
    filter,
    replacement,
    mapDocument,
    outputType,
    options,
}) => {
    let res: WithId<Document> | null = null;
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const collection = mongoClient.db(database).collection(collectionName);

        if (options) {
            res = await collection.findOneAndReplace(
                filter,
                replacement,
                options,
            );
        } else {
            res = await collection.findOneAndReplace(filter, replacement);
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

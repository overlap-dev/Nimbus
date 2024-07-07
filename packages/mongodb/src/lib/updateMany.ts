import { Exception } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import {
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

export type UpdateManyInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    update: UpdateFilter<Document>;
    options?: UpdateOptions;
};

export type UpdateMany = (
    input: UpdateManyInput,
) => Promise<E.Either<Exception, UpdateResult<Document>>>;

export const updateMany: UpdateMany = async ({
    mongoUrl,
    database,
    collectionName,
    filter,
    update,
    options,
}) => {
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const res = await mongoClient
            .db(database)
            .collection(collectionName)
            .updateMany(filter, update, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

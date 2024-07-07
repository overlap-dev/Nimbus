import { Exception } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import { DeleteOptions, DeleteResult, Document, Filter } from 'mongodb';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

export type DeleteManyInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

export type DeleteMany = (
    input: DeleteManyInput,
) => Promise<E.Either<Exception, DeleteResult>>;

export const deleteMany: DeleteMany = async ({
    mongoUrl,
    database,
    collectionName,
    filter,
    options,
}) => {
    try {
        const mongoClient = await getMongoClient(mongoUrl);

        const res = await mongoClient
            .db(database)
            .collection(collectionName)
            .deleteMany(filter, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

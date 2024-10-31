import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type { DeleteOptions, DeleteResult, Document, Filter } from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

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

import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type { DeleteOptions, DeleteResult, Document, Filter } from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type DeleteOneInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

export type DeleteOne = (
    input: DeleteOneInput,
) => Promise<E.Either<Exception, DeleteResult>>;

export const deleteOne: DeleteOne = async ({
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
            .deleteOne(filter, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type { CountDocumentsOptions, Document, Filter } from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type CountDocumentsInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    options?: CountDocumentsOptions;
};

export type CountDocuments = (
    input: CountDocumentsInput,
) => Promise<E.Either<Exception, number>>;

export const countDocuments: CountDocuments = async ({
    mongoUrl,
    database,
    collectionName,
    filter,
    options,
}) => {
    let res = 0;

    try {
        const mongoClient = await getMongoClient(mongoUrl);

        res = await mongoClient
            .db(database)
            .collection(collectionName)
            .countDocuments(filter, options);
    } catch (error) {
        return E.left(handleMongoError(error));
    }

    return E.right(res);
};

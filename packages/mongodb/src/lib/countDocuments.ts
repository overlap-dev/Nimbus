import { Exception } from '@ovl-nimbus/core';
import * as E from 'fp-ts/Either';
import { CountDocumentsOptions, Document, Filter } from 'mongodb';
import { handleMongoError } from './handleMongoError';
import { getMongoClient } from './mongodbClient';

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

import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import { handleMongoError } from './handleMongoError.ts';
import { getMongoClient } from './mongodbClient.ts';

export type UpdateOneInput = {
    mongoUrl: string;
    database: string;
    collectionName: string;
    filter: Filter<Document>;
    update: UpdateFilter<Document> | Document[];
    options?: UpdateOptions;
};

export type UpdateOne = (
    input: UpdateOneInput,
) => Promise<E.Either<Exception, UpdateResult<Document>>>;

export const updateOne: UpdateOne = async ({
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
            .updateOne(filter, update, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

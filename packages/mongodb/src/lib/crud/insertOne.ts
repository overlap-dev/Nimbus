import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Collection,
    Document,
    InsertOneOptions,
    InsertOneResult,
    OptionalUnlessRequiredId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type InsertOneInput = {
    collection: Collection<Document>;
    document: OptionalUnlessRequiredId<Document>;
    options?: InsertOneOptions;
};

export type InsertOne = (
    input: InsertOneInput,
) => Promise<E.Either<Exception, InsertOneResult<Document>>>;

export const insertOne: InsertOne = async ({
    collection,
    document,
    options,
}) => {
    try {
        const res = await collection.insertOne(document, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

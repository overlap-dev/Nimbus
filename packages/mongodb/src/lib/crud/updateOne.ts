import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Collection,
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type UpdateOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    update: UpdateFilter<Document> | Document[];
    options?: UpdateOptions;
};

export type UpdateOne = (
    input: UpdateOneInput,
) => Promise<E.Either<Exception, UpdateResult<Document>>>;

export const updateOne: UpdateOne = async ({
    collection,
    filter,
    update,
    options,
}) => {
    try {
        const res = await collection.updateOne(filter, update, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

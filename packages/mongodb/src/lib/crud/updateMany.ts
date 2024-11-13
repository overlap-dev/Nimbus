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

export type UpdateManyInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    update: UpdateFilter<Document>;
    options?: UpdateOptions;
};

export type UpdateMany = (
    input: UpdateManyInput,
) => Promise<E.Either<Exception, UpdateResult<Document>>>;

export const updateMany: UpdateMany = async ({
    collection,
    filter,
    update,
    options,
}) => {
    try {
        const res = await collection.updateMany(filter, update, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

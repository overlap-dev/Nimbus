import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Collection,
    DeleteOptions,
    DeleteResult,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type DeleteManyInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

export type DeleteMany = (
    input: DeleteManyInput,
) => Promise<E.Either<Exception, DeleteResult>>;

export const deleteMany: DeleteMany = async ({
    collection,
    filter,
    options,
}) => {
    try {
        const res = await collection.deleteMany(filter, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

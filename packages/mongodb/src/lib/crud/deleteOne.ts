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

export type DeleteOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: DeleteOptions;
};

export type DeleteOne = (
    input: DeleteOneInput,
) => Promise<E.Either<Exception, DeleteResult>>;

export const deleteOne: DeleteOne = async ({
    collection,
    filter,
    options,
}) => {
    try {
        const res = await collection.deleteOne(filter, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

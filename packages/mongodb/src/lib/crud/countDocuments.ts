import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Collection,
    CountDocumentsOptions,
    Document,
    Filter,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type CountDocumentsInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    options?: CountDocumentsOptions;
};

export type CountDocuments = (
    input: CountDocumentsInput,
) => Promise<E.Either<Exception, number>>;

export const countDocuments: CountDocuments = async ({
    collection,
    filter,
    options,
}) => {
    let res = 0;

    try {
        res = await collection
            .countDocuments(filter, options);
    } catch (error) {
        return E.left(handleMongoError(error));
    }

    return E.right(res);
};

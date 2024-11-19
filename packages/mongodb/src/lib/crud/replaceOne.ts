import * as E from '@baetheus/fun/either';
import type { Exception } from '@nimbus/core';
import type {
    Collection,
    Document,
    Filter,
    ReplaceOptions,
    UpdateResult,
    WithoutId,
} from 'mongodb';
import { handleMongoError } from '../handleMongoError.ts';

export type ReplaceOneInput = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    replacement: WithoutId<Document>;
    options?: ReplaceOptions;
};

export type ReplaceOne = (
    input: ReplaceOneInput,
) => Promise<E.Either<Exception, Document | UpdateResult<Document>>>;

export const replaceOne: ReplaceOne = async ({
    collection,
    filter,
    replacement,
    options,
}) => {
    try {
        const res = await collection.replaceOne(filter, replacement, options);

        return E.right(res);
    } catch (error) {
        return E.left(handleMongoError(error));
    }
};

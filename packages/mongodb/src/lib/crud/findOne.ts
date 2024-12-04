import { GenericException, NotFoundException } from '@nimbus/core';
import type { Collection, Document, Filter, WithId } from 'mongodb';
import type { ZodType } from 'zod';
import { handleMongoError } from '../handleMongoError.ts';

export type FindOneInput<TData> = {
    collection: Collection<Document>;
    filter: Filter<Document>;
    mapDocument: (document: Document) => TData;
    outputType: ZodType;
};

export type FindOne = <TData>(
    input: FindOneInput<TData>,
) => Promise<TData>;

export const findOne: FindOne = async ({
    collection,
    filter,
    mapDocument,
    outputType,
}) => {
    let res: WithId<Document> | null = null;

    try {
        res = await collection.findOne(filter);
    } catch (error) {
        throw handleMongoError(error);
    }

    if (!res) {
        throw new NotFoundException('Document not found');
    }

    try {
        return outputType.parse(mapDocument(res));
    } catch (error) {
        const exception = error instanceof Error
            ? new GenericException().fromError(error)
            : new GenericException();

        throw exception;
    }
};

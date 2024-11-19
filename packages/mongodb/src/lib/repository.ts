import {
    GenericException,
    type Repository,
    type RepositoryReadOptions,
} from '@nimbus/core';
import type { Collection, Document } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { ZodType } from 'zod';
import { deleteOne } from './crud/deleteOne.ts';
import { find } from './crud/find.ts';
import { findOne } from './crud/findOne.ts';
import { insertOne } from './crud/insertOne.ts';
import { replaceOne } from './crud/replaceOne.ts';
import { MongoJSON } from './mongoJSON.ts';

export class MongoDBRepository<TEntity extends Record<string, any>>
    implements Repository<TEntity> {
    private _collection: Collection<Document>;
    private _entityType: ZodType;

    constructor(collection: Collection<Document>, entityType: ZodType) {
        this._collection = collection;
        this._entityType = entityType;
    }

    private _mapDocumentToEntity(doc: Document): TEntity {
        return doc as TEntity;
    }

    private _mapEntityToDocument(item: TEntity): Document {
        return item as Document;
    }

    public read({
        limit,
        skip,
        sortDirection,
        sortField,
        filterString,
    }: RepositoryReadOptions) {
        const filter = MongoJSON.parse(filterString ?? '{}');

        return find({
            collection: this._collection,
            filter: filter,
            limit: limit,
            skip: skip,
            sort: {
                [sortField ?? 'createdAt']: sortDirection ?? 'asc',
            },
            mapDocument: this._mapDocumentToEntity,
            outputType: this._entityType,
        });
    }

    public readById(id: string) {
        return findOne({
            collection: this._collection,
            filter: { _id: new ObjectId(id) },
            mapDocument: this._mapDocumentToEntity,
            outputType: this._entityType,
        });
    }

    public async create(item: TEntity) {
        await insertOne({
            collection: this._collection,
            document: this._mapEntityToDocument(item),
        });

        return item;
    }

    public async update(item: TEntity) {
        if (typeof item._id !== 'string') {
            throw new GenericException(
                'MongoDBRepository.update :: Item is missing the _id field',
            );
        }

        await replaceOne({
            collection: this._collection,
            filter: { _id: new ObjectId(item._id) },
            replacement: this._mapEntityToDocument(item),
        });

        return item;
    }

    public async delete(item: TEntity) {
        if (typeof item._id !== 'string') {
            throw new GenericException(
                'MongoDBRepository.delete :: Item is missing the _id field',
            );
        }

        await deleteOne({
            collection: this._collection,
            filter: { _id: new ObjectId(item._id) },
        });

        return item;
    }
}

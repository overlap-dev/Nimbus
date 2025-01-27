import { NotFoundException } from '@nimbus/core';
import { toSnakeCase } from '@std/text';
import type {
    BulkWriteOptions,
    Collection,
    CountDocumentsOptions,
    DeleteOptions,
    Document,
    Filter,
    FindOptions,
    InsertOneOptions,
    ReplaceOptions,
    Sort,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import type { ZodType } from 'zod';
import { bulkWrite } from './crud/bulkWrite.ts';
import { countDocuments } from './crud/countDocuments.ts';
import { deleteMany } from './crud/deleteMany.ts';
import { deleteOne } from './crud/deleteOne.ts';
import { find } from './crud/find.ts';
import { findOne } from './crud/findOne.ts';
import { insertMany } from './crud/insertMany.ts';
import { insertOne } from './crud/insertOne.ts';
import { replaceOne } from './crud/replaceOne.ts';

export type WithStringId<TSchema> = Omit<TSchema, '_id'> & {
    _id: string;
};

/**
 * Repository for interacting with a MongoDB Collection
 * which provides a type-safe interface for MongoDB CRUD operations.
 *
 * Why do we not implement a generic repository interface?
 *
 * Implementing a generic repository interface is incredibly difficult in terms of
 * mapping filter patterns to the Database without the user having to change a
 * filter input when switching databases in the background.
 *
 * So we feel it is better to make the underlying data store obvious to the user
 * and give the user a way to interact with the repository in a way that feels
 * natural to the underlying data store.
 *
 * @param collection - MongoDB Collection instance
 * @param entityType - Zod type for validating the data and ensure type safety
 * @param entityName - Name for the entity, e.g. used in error messages like "Entity not found"
 *
 * @example
 * ```ts
 * import { MongoDBRepository } from '@nimbus/mongodb';
 * import { getEnv } from '@nimbus/utils';
 * import { mongoClient } from './mongoDBClient.ts';
 * import { User } from './user.type.ts';
 * import { USER_COLLECTION } from './user.collection.ts';
 *
 * class UserRepository extends MongoDBRepository<User> {
 *   constructor() {
 *     const env = getEnv({ variables: ['MONGO_DB'] });
 *
 *     super(
 *       mongoClient.db(env.MONGO_DB).collection(USER_COLLECTION.name),
 *       User,
 *     );
 *   }
 *
 *   override _mapDocumentToEntity(doc: Document): User {
 *     return User.parse({
 *       _id: doc._id.toString(),
 *       email: doc.email,
 *     });
 *   }
 *
 *   override _mapEntityToDocument(user: User): Document {
 *     return {
 *       _id: new ObjectId(user._id),
 *       email: user.email,
 *     };
 *   }
 * }
 *
 * export const userRepository = new UserRepository();
 * ```
 */
export class MongoDBRepository<
    TEntity extends WithStringId<Record<string, any>>,
> {
    protected _collection: Collection<Document>;
    protected _entityType: ZodType;
    protected _entityName: string;

    constructor(
        collection: Collection<Document>,
        entityType: ZodType,
        entityName?: string,
    ) {
        this._collection = collection;
        this._entityType = entityType;
        this._entityName = entityName ?? 'Document';
    }

    /**
     * Function to map the MongoDB Document to the Entity.
     * ZodType.parse is used to ensure the data is valid and type-safe.
     */
    protected _mapDocumentToEntity(doc: Document): TEntity {
        return this._entityType.parse(doc);
    }

    /**
     * Function to map the Entity to a  MongoDB Document.
     */
    protected _mapEntityToDocument(item: TEntity): Document {
        return item as Document;
    }

    /**
     * Find one document based on a given filter.
     */
    public async findOne({
        filter,
    }: {
        filter: Filter<Document>;
    }): Promise<TEntity> {
        try {
            const res = await findOne({
                collection: this._collection,
                filter,
                mapDocument: this._mapDocumentToEntity,
                outputType: this._entityType,
            });

            return res;
        } catch (error: any) {
            if (error.name === 'NOT_FOUND_EXCEPTION') {
                throw new NotFoundException(
                    `${this._entityName} not found`,
                    {
                        errorCode: `${
                            toSnakeCase(this._entityName).toUpperCase()
                        }_NOT_FOUND`,
                        reason:
                            `Could not find ${this._entityName} matching the given filter`,
                    },
                );
            }

            throw error;
        }
    }

    /**
     * Find multiple documents based on a given filter.
     */
    public find({
        filter,
        limit,
        skip,
        sort,
        project,
        options,
    }: {
        filter: Filter<Document>;
        limit?: number;
        skip?: number;
        sort?: Sort;
        project?: Document;
        options?: FindOptions;
    }): Promise<TEntity[]> {
        return find({
            collection: this._collection,
            filter,
            limit,
            skip,
            sort,
            project,
            mapDocument: this._mapDocumentToEntity,
            outputType: this._entityType,
            options,
        });
    }

    /**
     * Count all documents matching a given filter.
     */
    public countDocuments({
        filter,
        options,
    }: {
        filter: Filter<Document>;
        options?: CountDocumentsOptions;
    }): Promise<number> {
        return countDocuments({
            collection: this._collection,
            filter,
            options,
        });
    }

    /**
     * Insert a single new document.
     */
    public async insertOne({
        item,
    }: {
        item: TEntity;
        options?: InsertOneOptions;
    }): Promise<TEntity> {
        await insertOne({
            collection: this._collection,
            document: this._mapEntityToDocument(item),
        });

        return item;
    }

    /**
     * Insert multiple new documents.
     */
    public async insertMany({
        items,
        options,
    }: {
        items: TEntity[];
        options?: BulkWriteOptions;
    }): Promise<TEntity[]> {
        await insertMany({
            collection: this._collection,
            documents: items.map(this._mapEntityToDocument),
            options,
        });

        return items;
    }

    /**
     * Replace a single document.
     */
    public async replaceOne({
        item,
        options,
    }: {
        item: TEntity;
        options?: ReplaceOptions;
    }): Promise<TEntity> {
        const res = await replaceOne({
            collection: this._collection,
            filter: { _id: new ObjectId(item._id) },
            replacement: this._mapEntityToDocument(item),
            options,
        });

        if (res.matchedCount === 0) {
            throw new NotFoundException(
                `${this._entityName} not found`,
                {
                    errorCode: `${
                        toSnakeCase(this._entityName).toUpperCase()
                    }_NOT_FOUND`,
                    reason:
                        `Could not find ${this._entityName} with the id: ${item._id}`,
                },
            );
        }

        return item;
    }

    /**
     * Replace multiple documents.
     */
    public async replaceMany({
        items,
        options,
    }: {
        items: TEntity[];
        options?: BulkWriteOptions;
    }): Promise<TEntity[]> {
        if (items.length > 0) {
            const operations = items.map((item) => ({
                replaceOne: {
                    filter: { _id: new ObjectId(item._id) },
                    replacement: this._mapEntityToDocument(item),
                },
            }));

            await bulkWrite({
                collection: this._collection,
                operations: operations,
                options,
            });
        }

        return items;
    }

    /**
     * Delete a single document.
     */
    public async deleteOne({
        item,
        options,
    }: {
        item: TEntity;
        options?: DeleteOptions;
    }): Promise<TEntity> {
        const res = await deleteOne({
            collection: this._collection,
            filter: { _id: new ObjectId(item._id) },
            options,
        });

        if (res.deletedCount === 0) {
            throw new NotFoundException(
                `${this._entityName} not found`,
                {
                    errorCode: `${
                        toSnakeCase(this._entityName).toUpperCase()
                    }_NOT_FOUND`,
                    reason:
                        `Could not find ${this._entityName} with the id: ${item._id}`,
                },
            );
        }

        return item;
    }

    /**
     * Delete multiple documents.
     */
    public async deleteMany({
        items,
        options,
    }: {
        items: TEntity[];
        options?: DeleteOptions;
    }): Promise<TEntity[]> {
        await deleteMany({
            collection: this._collection,
            filter: {
                _id: { $in: items.map((item) => new ObjectId(item._id)) },
            },
            options,
        });

        return items;
    }
}

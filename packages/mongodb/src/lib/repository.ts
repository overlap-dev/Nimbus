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

    constructor(collection: Collection<Document>, entityType: ZodType) {
        this._collection = collection;
        this._entityType = entityType;
    }

    protected _mapDocumentToEntity(doc: Document): TEntity {
        return this._entityType.parse(doc);
    }

    protected _mapEntityToDocument(item: TEntity): Document {
        return item as Document;
    }

    public findOne({
        filter,
    }: {
        filter: Filter<Document>;
    }): Promise<TEntity> {
        return findOne({
            collection: this._collection,
            filter,
            mapDocument: this._mapDocumentToEntity,
            outputType: this._entityType,
        });
    }

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

    public async replaceOne({
        item,
        options,
    }: {
        item: TEntity;
        options?: ReplaceOptions;
    }): Promise<TEntity> {
        await replaceOne({
            collection: this._collection,
            filter: { _id: new ObjectId(item._id) },
            replacement: this._mapEntityToDocument(item),
            options,
        });

        return item;
    }

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

    public async deleteOne({
        item,
        options,
    }: {
        item: TEntity;
        options?: DeleteOptions;
    }): Promise<TEntity> {
        await deleteOne({
            collection: this._collection,
            filter: { _id: new ObjectId(item._id) },
            options,
        });

        return item;
    }

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

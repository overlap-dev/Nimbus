import * as log from '@std/log';
import type {
    CreateCollectionOptions,
    Db,
    IndexDescription,
    MongoClient,
} from 'mongodb';

/**
 * Type to define a mongo collection.
 */
export type MongoCollectionDefinition = {
    name: string;
    options?: CreateCollectionOptions;
    indexes?: IndexDescription[];
};

/**
 * Type to define the input for the deployMongoCollection function.
 */
export type DeployMongoCollectionInput = {
    mongoClient: MongoClient;
    dbName: string;
    collectionDefinition: MongoCollectionDefinition;
    allowUpdateIndexes: boolean;
};

/**
 * Deploys a collection to a MongoDB database.
 *
 * Either creates a new collection, or updates an existing collection (collMod).
 * Indexes are created or dropped to match the input set.
 * Indexes on existing collections are only updated if `allowUpdateIndexes` is set to `true`.
 *
 * @param {DeployMongoCollectionInput} input
 * @param {MongoClient} input.mongoClient - A MongoDB client instance
 * @param {string} input.dbName - The name of the database
 * @param {MongoCollectionDefinition} input.collectionDefinition - The collection definition
 * @param {boolean} input.allowUpdateIndexes - Whether to update indexes on existing collections
 */
export const deployMongoCollection = async ({
    mongoClient,
    dbName,
    collectionDefinition,
    allowUpdateIndexes,
}: DeployMongoCollectionInput): Promise<string> => {
    const db = mongoClient.db(dbName);
    const collectionName = collectionDefinition.name;

    log.info(
        `Deploying collection "${collectionName}" on database "${dbName}" ...`,
    );

    if (await collectionExists(db, collectionDefinition)) {
        log.info(
            `Collection "${collectionName}" exists. Updating collection ...`,
        );
        await updateCollection(db, allowUpdateIndexes, collectionDefinition);
    } else {
        log.info(
            `Collection "${collectionName}" does not exist. Creating collection ...`,
        );
        await createCollection(db, collectionDefinition);
    }

    return 'OK';
};

/**
 * Checks if a collection exists in a database.
 *
 * @param {Db} db - The database to check.
 * @param {MongoCollectionDefinition} collectionDefinition - The collection definition
 * @returns {Promise<boolean>} Whether the collection exists.
 */
const collectionExists = async (
    db: Db,
    { name }: MongoCollectionDefinition,
) => {
    const collections = await db
        .listCollections({ name: name }, { nameOnly: true })
        .toArray();

    return collections.findIndex((item) => item.name === name) > -1;
};

/**
 * Creates a collection in a database.
 *
 * @param {Db} db - The database to create the collection in.
 * @param {MongoCollectionDefinition} collectionDefinition - The collection definition
 */
const createCollection = async (
    db: Db,
    { name, options, indexes }: MongoCollectionDefinition,
) => {
    await db.createCollection(name, options);
    log.info(`Collection "${name}" created.`);

    if (indexes?.length) {
        await db.collection(name).createIndexes(indexes);
        log.info(
            `Added ${indexes.length} indexes for collection "${name}".`,
        );
    }
};

/**
 * Updates a collection in a database.
 *
 * @param {Db} db - The database to update the collection in.
 * @param {boolean} allowUpdateIndexes - Whether to update indexes on existing collections
 * @param {MongoCollectionDefinition} collectionDefinition - The collection definition
 */
const updateCollection = async (
    db: Db,
    allowUpdateIndexes: boolean,
    { name, options, indexes }: MongoCollectionDefinition,
) => {
    await db.command({ collMod: name, ...options });
    log.info(`Collection "${name}" updated.`);

    if (allowUpdateIndexes) {
        const indexesWithNames = (indexes ?? []).map((index) => {
            if (index.name) {
                return index;
            }

            return {
                ...index,
                name: Object.entries(index.key)
                    .reduce((acc: string[], [k, v]) => {
                        return [...acc, `${k}_${v}`];
                    }, [])
                    .join('_'),
            };
        });

        const existingIndexes = await (
            await db.collection(name).listIndexes().toArray()
        )
            .map((obj) => obj.name)
            .filter((i) => i !== '_id_');

        const indexesToAdd = indexesWithNames.filter((index) => {
            return !existingIndexes.includes(index.name);
        });

        const indexesToDelete = existingIndexes.filter((existingIndex) => {
            return (
                indexesWithNames.findIndex((i) => i.name === existingIndex) ===
                    -1
            );
        });

        if (indexesToAdd.length) {
            await db.collection(name).createIndexes(indexesToAdd);
            log.info(
                `Added ${indexesToAdd.length} indexes for collection "${name}".`,
            );
        }

        if (indexesToDelete.length) {
            await Promise.all(
                indexesToDelete?.map((index) => {
                    console.log(`Dropping ${index}`);
                    return db.collection(name).dropIndex(index);
                }),
            );
            log.info(
                `Deleted ${indexesToDelete.length} indexes for collection "${name}".`,
            );
        }
    }
};

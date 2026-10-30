import { getEnv, getLogger } from '@nimbus-cqrs/core';
import {
    deployMongoCollection,
    getMongoConnectionManager,
    type MongoCollectionDefinition,
} from '@nimbus-cqrs/mongodb';
import { initMongoDB } from '../api/mongodb.ts';
import { OBSERVER_CHECKPOINTS_COLLECTION } from '../api/shared/lib/eventsourcingdb/observer-checkpoints.collection.ts';
import { TICKETING_NOTIFIED_ASSIGNMENTS_COLLECTION } from '../api/ticketing/agg-ticket/shell/stores/notified-assignments.collection.ts';
import { TICKETING_PM_SETTLED_ARCHIVE_COLLECTION } from '../api/ticketing/pm-settled-archive/shell/stores/settled-archive.collection.ts';
import { TICKETING_RM_TICKETS_COLLECTION } from '../api/ticketing/rm-tickets/shell/stores/tickets.collection.ts';
import { setupLogger } from '../logger.ts';

setupLogger();

const COLLECTIONS: MongoCollectionDefinition[] = [
    OBSERVER_CHECKPOINTS_COLLECTION,
    TICKETING_RM_TICKETS_COLLECTION,
    TICKETING_PM_SETTLED_ARCHIVE_COLLECTION,
    TICKETING_NOTIFIED_ASSIGNMENTS_COLLECTION,
];

try {
    const env = getEnv({
        variables: ['MONGO_DB'],
    });

    await initMongoDB();

    const mongoClient = await getMongoConnectionManager('default').getClient();

    for (const collectionDefinition of COLLECTIONS) {
        await deployMongoCollection({
            mongoClient,
            dbName: env.MONGO_DB,
            collectionDefinition,
            allowUpdateIndexes: true,
        });
    }

    process.exitCode = 0;

    getLogger().info({
        message:
            '\n--------------------------------\nMongoDB collections deployed successfully!\n--------------------------------\n',
    });
} catch (error) {
    getLogger().error({
        message:
            '\n--------------------------------\nFailed to deploy MongoDB collections!\n--------------------------------\n',
        error: error as Error,
    });
    process.exitCode = 1;
} finally {
    await getMongoConnectionManager('default').close();
}

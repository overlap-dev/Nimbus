import { deployMongoCollection } from '@nimbus/mongodb';
import 'jsr:@std/dotenv/load';
import process from 'node:process';
import { ACCOUNT_COLLECTION } from './account/shell/account.collection.ts';
import { initMongoConnectionManager, mongoManager } from './mongodb.ts';

const { MONGO_DB } = process.env;

try {
    initMongoConnectionManager();

    const mongoClient = await mongoManager.getClient();

    const result = await Promise.allSettled([
        deployMongoCollection({
            mongoClient: mongoClient,
            dbName: MONGO_DB ?? '',
            collectionDefinition: ACCOUNT_COLLECTION,
            allowUpdateIndexes: true,
        }),
    ]);

    console.log('\nDeployed collections', JSON.stringify(result, null, 2));
    process.exit(0);
} catch (error) {
    console.error(error);
    process.exit(1);
}

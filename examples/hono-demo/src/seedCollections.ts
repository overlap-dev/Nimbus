import { deployMongoCollection } from '@nimbus/mongodb';
import '@std/dotenv/load';
import process from 'node:process';
import { USERS_COLLECTION } from './iam/users/shell/mongodb/user.collection.ts';
import {
    initMongoConnectionManager,
    mongoManager,
} from './shared/shell/mongodb.ts';

const { MONGO_DB } = process.env;

try {
    initMongoConnectionManager();

    const mongoClient = await mongoManager.getClient();

    const result = await Promise.allSettled([
        deployMongoCollection({
            mongoClient: mongoClient,
            dbName: MONGO_DB ?? '',
            collectionDefinition: USERS_COLLECTION,
            allowUpdateIndexes: true,
        }),
    ]);

    console.log('\nDeployed collections', JSON.stringify(result, null, 2));
    process.exit(0);
} catch (error) {
    console.error(error);
    process.exit(1);
}

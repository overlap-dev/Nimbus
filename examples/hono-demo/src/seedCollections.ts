import { deployMongoCollection } from '@nimbus/mongodb';
import '@std/dotenv/load';
import process from 'node:process';
import { USERS_COLLECTION } from './iam/users/shell/mongodb/user.collection.ts';
import { mongoManager } from './shared/shell/mongodb.ts';

const { MONGO_DB } = process.env;

try {
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
    await mongoManager.close();
    process.exit(0);
} catch (error) {
    console.error(error);
    await mongoManager.close().catch(() => {});
    process.exit(1);
}

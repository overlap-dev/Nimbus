import { MongoConnectionManager } from '@nimbus/mongodb';
import { ServerApiVersion } from 'mongodb';
import process from 'node:process';

export let mongoManager: MongoConnectionManager;

export const initMongoConnectionManager = () => {
    mongoManager = MongoConnectionManager.getInstance(
        process.env['MONGO_URL'] ?? '',
        {
            connectionTimeout: 1000 * 60 * 5,
            mongoClientOptions: {
                appName: 'the-expanse',
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: false,
                    deprecationErrors: true,
                },
                maxPoolSize: 10,
                minPoolSize: 0,
                maxIdleTimeMS: 1000 * 60 * 1, // 1 minutes idle timeout
                connectTimeoutMS: 1000 * 15, // 15 seconds connection timeout
                socketTimeoutMS: 1000 * 30, // 30 seconds socket timeout
            },
        },
    );

    // Check to see if the MongoDB connection can be cleaned up
    // This is to prevent the MongoDB connection from being left open for too long
    setInterval(() => {
        mongoManager.cleanup().catch(console.error);
    }, 1000 * 60); // Check every minute
};

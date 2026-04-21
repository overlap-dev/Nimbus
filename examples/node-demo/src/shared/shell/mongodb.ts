import { MongoConnectionManager } from '@nimbus-cqrs/mongodb';
import { ServerApiVersion } from 'mongodb';
import process from 'node:process';

export const mongoManager = MongoConnectionManager.getInstance(
    process.env['MONGO_URL'] ?? '',
    {
        appName: 'nimbus-node-demo',
        serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
        },
    },
);

import { MongoClient } from 'mongodb';
import process from 'node:process';

export const mongoClient = new MongoClient(process.env['MONGO_URL'] ?? '', {
    appName: 'the-expanse',
    retryWrites: true,
    writeConcern: {
        w: 'majority',
    },
});

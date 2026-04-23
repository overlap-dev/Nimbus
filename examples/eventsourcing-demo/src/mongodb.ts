import { MongoConnectionManager } from '@nimbus-cqrs/mongodb';
import { getEnv } from '@nimbus-cqrs/utils';
import { ServerApiVersion } from 'mongodb';

export let mongoManager: MongoConnectionManager;

export const initMongoDB = () => {
    const env = getEnv({
        variables: ['MONGO_URL'],
    });

    mongoManager = MongoConnectionManager.getInstance(
        env['MONGO_URL'],
        {
            appName: 'nimbus-eventsourcing-demo',
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            },
        },
    );
};

import { getEnv, getLogger } from '@nimbus-cqrs/core';
import {
    getMongoConnectionManager,
    setupMongoConnectionManager,
} from '@nimbus-cqrs/mongodb';
import { ServerApiVersion } from 'mongodb';

export const initMongoDB = async () => {
    const env = getEnv({
        variables: ['MONGO_URL'],
    });

    setupMongoConnectionManager({
        name: 'default',
        uri: env.MONGO_URL,
        options: {
            appName: 'nimbus-esdm-full-example',
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            },
        },
    });

    const dbHealth = await getMongoConnectionManager('default').healthCheck();

    getLogger().info({
        message: 'MongoDB health check',
        data: dbHealth,
    });
};

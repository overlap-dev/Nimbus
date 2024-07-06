import { MongoClient, MongoClientOptions } from 'mongodb';

const sharedMongoClients: Record<string, MongoClient> = {};

export const getMongoClient = async (
    url: string,
    options?: MongoClientOptions,
): Promise<MongoClient> => {
    if (!sharedMongoClients[url]) {
        sharedMongoClients[url] = await MongoClient.connect(
            url,
            Object.assign({}, options),
        );
    }

    return sharedMongoClients[url];
};

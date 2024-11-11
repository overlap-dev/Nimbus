import { MongoClient, MongoClientOptions } from 'mongodb';

const sharedMongoClients: Record<string, MongoClient> = {};

export const initMongoClient = async (
    url: string,
    options?: MongoClientOptions,
): Promise<MongoClient> => {
    async function connect() {
        await sharedMongoClients[url].connect();
    }

    if (!sharedMongoClients[url]) {
        sharedMongoClients[url] = new MongoClient(
            url,
            Object.assign({}, options),
        );

        sharedMongoClients[url].on('serverOpening', (event) => {
            console.log(
                `MongoDB :: serverOpening :: connection to ${event.address} established.`,
            );
        });
        sharedMongoClients[url].on('serverClosed', async (event) => {
            console.log(
                `MongoDB :: serverClosed :: connection to ${event.address} lost.\nReconnecting...`,
            );
            await connect();
        });

        await connect();
    }

    return sharedMongoClients[url];
};

export const getMongoClient = (url: string): MongoClient => {
    if (!sharedMongoClients[url]) {
        throw new Error(`MongoClient not initialized!`);
    }

    return sharedMongoClients[url];
};

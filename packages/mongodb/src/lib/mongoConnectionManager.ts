import { getLogger } from '@nimbus/core';
import {
    type Collection,
    type Db,
    MongoClient,
    type MongoClientOptions,
} from 'mongodb';

/**
 * Options for the MongoConnectionManager.
 */
export type MongoConnectionManagerOptions = {
    connectionTimeout?: number;
    mongoClientOptions: MongoClientOptions;
};

/**
 * Singleton class to manage MongoDB connections.
 *
 * @example
 * ```ts
 * export let mongoManager: MongoConnectionManager;
 *
 * export const initMongoConnectionManager = () => {
 *     mongoManager = MongoConnectionManager.getInstance(
 *         process.env['MONGO_URL'] ?? '',
 *         {
 *             connectionTimeout: 1000 * 60 * 5,
 *             mongoClientOptions: {
 *                 appName: 'the-expanse',
 *                 serverApi: {
 *                     version: ServerApiVersion.v1,
 *                     strict: false,
 *                     deprecationErrors: true,
 *                 },
 *                 maxPoolSize: 10,
 *                 minPoolSize: 0,
 *                 maxIdleTimeMS: 1000 * 60 * 1, // 1 minutes idle timeout
 *                 connectTimeoutMS: 1000 * 15, // 15 seconds connection timeout
 *                 socketTimeoutMS: 1000 * 30, // 30 seconds socket timeout
 *             },
 *         },
 *     );
 *
 *     setInterval(() => {
 *         mongoManager.cleanup().catch(console.error);
 *     }, 1000 * 60); // Check every minute
 * };
 *
 * initMongoConnectionManager();
 * ```
 */
export class MongoConnectionManager {
    private static _instance: MongoConnectionManager;
    private _client: MongoClient | null = null;
    private _lastUsed: number = Date.now();
    private _isConnecting: boolean = false;
    private readonly _uri: string;
    private readonly _connectionTimeout: number;
    private readonly _mongoClientOptions: MongoClientOptions;

    /**
     * Initialize the MongoConnectionManager.
     *
     * @param {string} uri - The MongoDB connection URI
     * @param {MongoConnectionManagerOptions} options - The options for the MongoConnectionManager
     */
    private constructor(uri: string, options: MongoConnectionManagerOptions) {
        this._uri = uri;
        this._connectionTimeout = options.connectionTimeout ?? 1000 * 60 * 30; // 30 minutes
        this._mongoClientOptions = options.mongoClientOptions;
    }

    /**
     * Create a new MongoDB connection.
     *
     * @returns {Promise<MongoClient>} The MongoDB client instance
     */
    private async createConnection(): Promise<MongoClient> {
        try {
            const client = new MongoClient(this._uri, this._mongoClientOptions);

            await client.connect();
            await client.db('admin').command({ ping: 1 });

            getLogger().info({
                category: 'Nimbus',
                message: 'MongoConnectionManger :: Successfully connected',
            });

            return client;
        } catch (error) {
            getLogger().critical({
                category: 'Nimbus',
                message: 'MongoConnectionManger :: Connection failed',
                data: {
                    error,
                },
            });

            throw error;
        }
    }

    /**
     * Test the MongoDB connection.
     *
     * @returns {Promise<boolean>} True if the connection is successful, false otherwise
     */
    private async testConnection(): Promise<boolean> {
        if (!this._client) return false;

        try {
            await this._client.db('admin').command({ ping: 1 });
            return true;
        } catch (error) {
            getLogger().warn({
                category: 'Nimbus',
                message: 'MongoConnectionManger :: Connection test failed',
                data: {
                    error,
                },
            });

            return false;
        }
    }

    /**
     * Get the singleton instance of the MongoConnectionManager.
     *
     * @param {string} uri - The MongoDB connection URI
     * @param {MongoConnectionManagerOptions} options - The options for the MongoConnectionManager
     * @param {MongoClientOptions} options.mongoClientOptions - The options for the MongoClient
     * @param {number} [options.connectionTimeout] - The connection timeout in milliseconds used to close inactive connections with the cleanup method. Defaults to 30 minutes.
     *
     * @returns {MongoConnectionManager} The singleton instance of the MongoConnectionManager
     */
    public static getInstance(
        uri: string,
        options: MongoConnectionManagerOptions,
    ): MongoConnectionManager {
        if (!MongoConnectionManager._instance) {
            MongoConnectionManager._instance = new MongoConnectionManager(
                uri,
                options,
            );
        }

        return MongoConnectionManager._instance;
    }

    /**
     * Get the MongoDB client instance.
     *
     * @returns {Promise<MongoClient>} The MongoDB client instance
     */
    public async getClient(): Promise<MongoClient> {
        this._lastUsed = Date.now();

        if (this._client && await this.testConnection()) {
            return this._client;
        }

        if (this._isConnecting) {
            // Wait for existing connection attempt
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return this.getClient();
        }

        try {
            this._isConnecting = true;
            this._client = await this.createConnection();
            return this._client;
        } finally {
            this._isConnecting = false;
        }
    }

    /**
     * Get a database instance from a fresh MongoDB client.
     *
     * @param {string} dbName - The name of the database
     * @returns {Promise<Db>} The database instance
     */
    public async getDatabase(dbName: string): Promise<Db> {
        const client = await this.getClient();
        return client.db(dbName);
    }

    /**
     * Get a collection instance from a database instance.
     *
     * @param {string} dbName - The name of the database
     * @param {string} collectionName - The name of the collection
     * @returns {Promise<Collection>} The collection instance
     */
    public async getCollection(
        dbName: string,
        collectionName: string,
    ): Promise<Collection> {
        const db = await this.getDatabase(dbName);
        return db.collection(collectionName);
    }

    /**
     * Check the health of the MongoDB connection.
     *
     * @returns {Promise<{ status: string; details?: string }>} The health status and details of the connection
     */
    public async healthCheck(): Promise<{ status: string; details?: string }> {
        try {
            await this.getClient();

            const isConnected = await this.testConnection();
            if (!isConnected) {
                return {
                    status: 'error',
                    details: 'Failed to ping MongoDB server',
                };
            }

            return { status: 'healthy' };
        } catch (error) {
            return {
                status: 'error',
                details: error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
            };
        }
    }

    /**
     * Close the MongoDB connection if it has been inactive for more than the defined connection timeout.
     *
     * @returns {Promise<void>}
     */
    public async cleanup(): Promise<void> {
        const now = Date.now();

        if (this._client && (now - this._lastUsed > this._connectionTimeout)) {
            try {
                await this._client.close();
                this._client = null;

                getLogger().info({
                    category: 'Nimbus',
                    message:
                        'MongoConnectionManger :: Closed inactive connection',
                });
            } catch (error: any) {
                getLogger().error({
                    category: 'Nimbus',
                    message:
                        'MongoConnectionManger :: Error closing inactive connection',
                    error,
                });
            }
        }
    }
}

import { getLogger } from '@nimbus/core';
import {
    type Collection,
    type Db,
    MongoClient,
    type MongoClientOptions,
} from 'mongodb';

/**
 * Singleton wrapper around a single long-lived `MongoClient`.
 *
 * The MongoDB Node driver already handles connection pooling, server
 * monitoring (SDAM), automatic reconnection, retryable reads/writes and
 * per-socket idle eviction via `maxIdleTimeMS`. This class therefore does
 * the minimum on top of the driver: hold one `MongoClient` for the lifetime
 * of the application and provide typed `getDatabase` / `getCollection`
 * convenience methods.
 *
 * Call {@link MongoConnectionManager#close} on graceful shutdown
 * (e.g. on `SIGTERM` / `SIGINT`) to drain the pool.
 *
 * @example
 * ```ts
 * import { MongoConnectionManager } from '@nimbus/mongodb';
 * import { ServerApiVersion } from 'mongodb';
 *
 * export const mongoManager = MongoConnectionManager.getInstance(
 *     process.env['MONGO_URL'] ?? '',
 *     {
 *         appName: 'my-app',
 *         serverApi: {
 *             version: ServerApiVersion.v1,
 *             strict: false,
 *             deprecationErrors: true,
 *         },
 *     },
 * );
 *
 * process.on('SIGTERM', () => {
 *     mongoManager.close().catch(console.error);
 * });
 * ```
 */
export class MongoConnectionManager {
    private static _instance: MongoConnectionManager | null = null;
    private _client: MongoClient | null = null;
    private _connecting: Promise<MongoClient> | null = null;
    private readonly _uri: string;
    private readonly _options?: MongoClientOptions;

    /**
     * Initialize the MongoConnectionManager.
     *
     * @param {string} uri - The MongoDB connection URI
     * @param {MongoClientOptions} [options] - Options forwarded to the underlying `MongoClient`
     */
    private constructor(uri: string, options?: MongoClientOptions) {
        this._uri = uri;
        this._options = options;
    }

    /**
     * Get the singleton instance of the MongoConnectionManager.
     *
     * Subsequent calls return the existing instance and ignore the arguments.
     *
     * @param {string} uri - The MongoDB connection URI
     * @param {MongoClientOptions} [options] - Options forwarded to the underlying `MongoClient`
     *
     * @returns {MongoConnectionManager} The singleton instance of the MongoConnectionManager
     */
    public static getInstance(
        uri: string,
        options?: MongoClientOptions,
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
     * Get the connected MongoDB client.
     *
     * Lazily creates and connects a single `MongoClient` on the first call.
     * Concurrent first-callers share the same in-flight `connect()` promise
     * so only one connection is established.
     *
     * @returns {Promise<MongoClient>} The MongoDB client instance
     */
    public getClient(): Promise<MongoClient> {
        if (this._client !== null) {
            return Promise.resolve(this._client);
        }

        if (this._connecting !== null) {
            return this._connecting;
        }

        this._connecting = (async () => {
            try {
                const client = new MongoClient(this._uri, this._options);
                await client.connect();
                this._client = client;

                getLogger().info({
                    category: 'Nimbus',
                    message: 'MongoConnectionManager :: Successfully connected',
                });

                return client;
            } catch (error) {
                getLogger().critical({
                    category: 'Nimbus',
                    message: 'MongoConnectionManager :: Connection failed',
                    error: error as Error,
                });

                throw error;
            }
        })().finally(() => {
            this._connecting = null;
        });

        return this._connecting;
    }

    /**
     * Get a database instance from the connected MongoDB client.
     *
     * @param {string} dbName - The name of the database
     * @returns {Promise<Db>} The database instance
     */
    public async getDatabase(dbName: string): Promise<Db> {
        const client = await this.getClient();
        return client.db(dbName);
    }

    /**
     * Get a collection instance from the connected MongoDB client.
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
     * Check the health of the MongoDB connection by issuing a `ping` against
     * the `admin` database.
     *
     * @returns {Promise<{ status: 'healthy' | 'error'; details?: string }>} The health status and optional error details
     */
    public async healthCheck(): Promise<
        { status: 'healthy' | 'error'; details?: string }
    > {
        try {
            const client = await this.getClient();
            await client.db('admin').command({ ping: 1 });
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
     * Close the underlying MongoDB client and drain its connection pool.
     *
     * Intended for graceful shutdown handlers. After `close()` resolves, the
     * next call to {@link MongoConnectionManager#getClient} establishes a
     * fresh connection.
     *
     * @returns {Promise<void>}
     */
    public async close(): Promise<void> {
        // If a connection is currently being established, wait for it to
        // settle so we don't leave an orphaned client behind after shutdown.
        if (this._connecting !== null) {
            try {
                await this._connecting;
            } catch {
                // The in-flight connect failed - there is no client to close.
            }
        }

        const client = this._client;

        if (client === null) {
            return;
        }

        try {
            await client.close();
            this._client = null;

            getLogger().info({
                category: 'Nimbus',
                message: 'MongoConnectionManager :: Connection closed',
            });
        } catch (error) {
            // Keep `_client` so the caller can retry `close()` and we don't
            // leak the still-open client by losing its only reference.
            getLogger().error({
                category: 'Nimbus',
                message: 'MongoConnectionManager :: Error closing connection',
                error: error as Error,
            });

            throw error;
        }
    }
}

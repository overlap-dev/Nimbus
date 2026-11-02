import type {
    Checkpoint,
    CheckpointStore,
    CheckpointUpdate,
} from './checkpoint.ts';

/**
 * A {@link CheckpointStore} that keeps checkpoints in process memory.
 *
 * Every restart starts from an empty store, so consumers replay the whole
 * stream. Use it in tests, or for consumers whose read models live in
 * memory as well and have to be rebuilt on every start anyway.
 *
 * @example
 * ```ts
 * import { InMemoryCheckpointStore } from '@nimbus-cqrs/core';
 *
 * const checkpointStore = new InMemoryCheckpointStore();
 * ```
 */
export class InMemoryCheckpointStore implements CheckpointStore {
    private readonly _checkpoints = new Map<string, Checkpoint>();

    /**
     * Loads the checkpoints of the given consumers, keyed by consumer name.
     *
     * @param consumers - The names of the consumers to load.
     * @returns The stored checkpoints by consumer name.
     */
    public load(
        consumers: readonly string[],
    ): Promise<Map<string, Checkpoint>> {
        const result = new Map<string, Checkpoint>();

        for (const consumer of consumers) {
            const checkpoint = this._checkpoints.get(consumer);

            if (checkpoint !== undefined) {
                result.set(consumer, structuredClone(checkpoint));
            }
        }

        return Promise.resolve(result);
    }

    /**
     * Persists every given update.
     *
     * @param updates - The checkpoints to persist.
     */
    public save(updates: readonly CheckpointUpdate[]): Promise<void> {
        const now = new Date().toISOString();

        for (const update of updates) {
            const previous = this._checkpoints.get(update.consumer);
            const position = update.position ?? previous?.position;

            this._checkpoints.set(update.consumer, {
                consumer: update.consumer,
                observer: update.observer,
                updatedAt: now,
                ...(position !== undefined ? { position } : {}),
                ...(update.failure !== undefined
                    ? { failure: { ...update.failure, at: now } }
                    : {}),
            });
        }

        return Promise.resolve();
    }

    /**
     * Moves a consumer to `position`, or back to the beginning when
     * `position` is omitted, and clears any failure marker.
     *
     * @param consumer - The name of the consumer to reset.
     * @param position - The position to resume after, or `undefined` to replay from the beginning.
     */
    public reset(consumer: string, position?: string): Promise<void> {
        const previous = this._checkpoints.get(consumer);

        if (previous === undefined) {
            return Promise.resolve();
        }

        this._checkpoints.set(consumer, {
            consumer,
            observer: previous.observer,
            updatedAt: new Date().toISOString(),
            ...(position !== undefined ? { position } : {}),
        });

        return Promise.resolve();
    }
}

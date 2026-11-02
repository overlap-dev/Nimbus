import { z } from 'zod';

/**
 * Records that the last attempt to handle the event at `position` failed.
 *
 * The marker is persisted next to the checkpoint so that any process, not
 * only the one running the observer, can see that a consumer is stuck. It
 * is cleared by the next successful save for that consumer.
 *
 * @property {string} position - The position of the event that could not be handled.
 * @property {string} error - A short description of the error (`name: message`).
 * @property {string} at - When the failure was recorded, as ISO 8601.
 */
export type CheckpointFailure = {
    position: string;
    error: string;
    at: string;
};

/**
 * Where one event consumer resumes after a restart.
 *
 * `position` is an opaque string owned by the event store integration. For
 * EventSourcingDB it is the id of the last event the consumer finished. It
 * is absent until the consumer finishes its first event, in which case the
 * consumer starts from the beginning of the stream.
 *
 * @property {string} consumer - The stable, unique name of the consumer. Renaming it replays the stream.
 * @property {string} observer - The name of the observer the consumer belongs to.
 * @property {string} [position] - The last position the consumer finished.
 * @property {string} updatedAt - When the checkpoint was last written, as ISO 8601.
 * @property {CheckpointFailure} [failure] - Set while the last attempt at the next position failed.
 */
export type Checkpoint = {
    consumer: string;
    observer: string;
    position?: string;
    updatedAt: string;
    failure?: CheckpointFailure;
};

/**
 * Zod schema matching {@link Checkpoint}. Store implementations use it to
 * validate what they read back.
 */
export const checkpointSchema = z.object({
    consumer: z.string().min(1),
    observer: z.string().min(1),
    position: z.string().min(1).optional(),
    updatedAt: z.iso.datetime(),
    failure: z
        .object({
            position: z.string().min(1),
            error: z.string(),
            at: z.iso.datetime(),
        })
        .optional(),
});

/**
 * One checkpoint to persist.
 *
 * `failure` marks the consumer as failed at `failure.position`. When it is
 * omitted any existing failure marker is cleared, so the marker always
 * reflects the most recent attempt. `position` is left untouched when
 * omitted, so a failure can be recorded for a consumer that has not
 * finished any event yet.
 *
 * @property {string} consumer - The name of the consumer.
 * @property {string} observer - The name of the observer the consumer belongs to.
 * @property {string} [position] - The last position the consumer finished.
 * @property {object} [failure] - The failed position and error description.
 */
export type CheckpointUpdate = {
    consumer: string;
    observer: string;
    position?: string;
    failure?: {
        position: string;
        error: string;
    };
};

/**
 * Persists where event consumers resume.
 *
 * Implementations live in the storage packages (for example
 * `MongoCheckpointStore` in `@nimbus-cqrs/mongodb`). The core ships
 * {@link InMemoryCheckpointStore} for tests and processes that may replay
 * on every start.
 *
 * @example
 * ```ts
 * import type { CheckpointStore } from '@nimbus-cqrs/core';
 *
 * const store: CheckpointStore = new InMemoryCheckpointStore();
 *
 * await store.save([
 *     { consumer: 'tickets', observer: 'ticketing', position: '42' },
 * ]);
 *
 * const checkpoints = await store.load(['tickets']);
 * checkpoints.get('tickets')?.position; // '42'
 * ```
 */
export type CheckpointStore = {
    /**
     * Loads the checkpoints of the given consumers, keyed by consumer name.
     * Consumers without a checkpoint are absent from the result.
     *
     * @param consumers - The names of the consumers to load.
     * @returns The stored checkpoints by consumer name.
     */
    load(consumers: readonly string[]): Promise<Map<string, Checkpoint>>;
    /**
     * Persists every given update. Implementations should write them in
     * one round trip where the storage allows it.
     *
     * @param updates - The checkpoints to persist.
     */
    save(updates: readonly CheckpointUpdate[]): Promise<void>;
    /**
     * Moves a consumer to `position`, or back to the beginning of the
     * stream when `position` is omitted, and clears any failure marker.
     *
     * This is an offline operation: the observer running the consumer
     * must not be active while the checkpoint is reset, since it keeps
     * its position in memory and would overwrite the reset on its next
     * save.
     *
     * @param consumer - The name of the consumer to reset.
     * @param position - The position to resume after, or `undefined` to replay from the beginning.
     */
    reset(consumer: string, position?: string): Promise<void>;
};

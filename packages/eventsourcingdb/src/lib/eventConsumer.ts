import type { CheckpointFailure, Event } from '@nimbus-cqrs/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';

/**
 * One stateful consumer of an observed event stream.
 *
 * A read-model projection, a policy, an event handler and a process manager
 * all share this shape. Each consumer owns a checkpoint keyed by its
 * {@link name}, so one of them can be rebuilt or halted without moving the
 * others on the same observer.
 *
 * Consumers run sequentially in the order they are declared on the
 * observer. A consumer that reads what another one writes should declare
 * it in {@link dependsOn} instead of relying on the order alone.
 *
 * @example
 * ```ts
 * import type { EventConsumer } from '@nimbus-cqrs/eventsourcingdb';
 *
 * export const ticketsProjection: EventConsumer = {
 *     name: 'ticketing.tickets',
 *     handles: (event) => event.type.startsWith('at.example.ticketing.ticket.'),
 *     handle: async (event) => {
 *         const ticket = ticketEventSchema.parse(event);
 *         await ticketsRepository.apply(ticket);
 *     },
 * };
 * ```
 */
export type EventConsumer = {
    /**
     * The checkpoint key. It has to be unique across the whole application,
     * not just within one observer, because checkpoint stores key on the
     * consumer name alone. It also has to stay stable: renaming a consumer
     * makes it replay the subject from the beginning.
     */
    readonly name: string;
    /**
     * Whether the consumer handles the given event. Events it does not
     * handle still advance its checkpoint, so the position stays
     * contiguous.
     *
     * @param event - The observed event, mapped to a Nimbus event.
     */
    readonly handles: (event: Event) => boolean;
    /**
     * Handles one event. A thrown error holds the consumer's checkpoint
     * while its siblings advance; the observer retries in place and halts
     * the consumer once the handler retries are exhausted.
     *
     * @param event - The observed event, mapped to a Nimbus event.
     * @param raw - The original EventSourcingDB event.
     */
    readonly handle: (event: Event, raw: EventSourcingDBEvent) => Promise<void>;
    /**
     * Names of consumers on the same observer this one reads from. They
     * have to be declared before this consumer. When a dependency fails on
     * an event, this consumer holds its position as well, so it never
     * checkpoints past data its dependency has not written yet. When a
     * dependency is halted, this consumer is halted too.
     *
     * A consumer that starts from its checkpoint must not depend on one
     * that starts from the head, since the latter never built state for
     * older events.
     */
    readonly dependsOn?: readonly string[];
    /**
     * Where the consumer starts on every start of the observer.
     *
     * - `checkpoint` (default): resumes after its stored checkpoint, or
     *   from the beginning of the subject when it has none.
     * - `head`: starts at the newest event of the subject, ignoring its
     *   stored checkpoint. Events written while the process was down are
     *   never delivered. Use this for live-only consumers such as pushing
     *   to connected clients or invalidating in-memory caches. The
     *   checkpoint is still persisted for visibility, but it has no effect
     *   on where the consumer resumes, so resetting it does nothing.
     */
    readonly startFrom?: 'checkpoint' | 'head';
};

/**
 * The runtime state of one {@link EventConsumer}.
 *
 * @property {string} name - The consumer name.
 * @property {string | null} position - The id of the last event the consumer finished, `null` before its first.
 * @property {boolean} halted - Whether the consumer gave up for the rest of the process lifetime.
 * @property {CheckpointFailure} [failure] - The most recent failure, from this run or loaded from the checkpoint store.
 */
export type ConsumerStatus = {
    name: string;
    position: string | null;
    halted: boolean;
    failure?: CheckpointFailure;
};

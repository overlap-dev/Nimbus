import { type Event, GenericException, getLogger } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { z } from 'zod';
import { toError } from '../toError.ts';

// TODO: integrate into the framework?
// When projections move into the framework, decide whether consumers
// can depend on each other. A failed consumer currently lets later ones
// advance, so a notification can be checkpointed even though the
// projection it reads never applied that event.

// Several consumers on one EventSourcingDB observer.
//
// A read-model projection, a policy, an event handler and a process manager
// can all watch the same subject. They share the replay. Each keeps its own
// checkpoint, so one of them can be rebuilt or halted without moving the
// others.
//
// The group's lower bound is the earliest checkpoint. Consumers already
// past that point skip the replayed events. Consumers run in the order they
// are declared, so one that reads another's read model is declared after it.
//
// A consumer that throws keeps its position while its siblings advance.
// The observer retries in place. After retries are exhausted that consumer
// is halted and its checkpoint stays on the last event it finished. A
// restart resumes at the event it could not apply.

/**
 * One stateful consumer of the event stream: a read-model projection, a
 * policy, an event handler or a process manager.
 *
 * Each owns a checkpoint keyed by {@link name}.
 */
export type ObserverConsumer = {
    readonly name: string;
    readonly handles: (event: Event) => boolean;
    readonly apply: (event: EventSourcingDBEvent) => Promise<void>;
};

/**
 * A checkpoint for an observer.
 */
export const observerCheckpointSchema = z.object({
    consumer: z.string().min(1),
    observerGroup: z.string().min(1),
    eventId: z.string().min(1).optional(),
    updatedAt: z.iso.datetime(),
    degraded: z
        .object({
            failedEventId: z.string().min(1),
            error: z.string(),
            at: z.iso.datetime(),
        })
        .optional(),
});
export type ObserverCheckpoint = z.infer<typeof observerCheckpointSchema>;

/**
 * The store in which the observer checkpoints are persisted.
 */
export type ObserverCheckpointStore = {
    getPositions(names: readonly string[]): Promise<Map<string, string>>;
    savePositions(updates: readonly ObserverCheckpointUpdate[]): Promise<void>;
};

/**
 * A consumer position to persist. `degraded` marks the consumer as halted at
 * `failedEventId`; without it any existing degraded marker is cleared, so the
 * marker always reflects the current state.
 */
export type ObserverCheckpointUpdate = {
    name: string;
    observerGroup: string;
    eventId?: string;
    degraded?: {
        failedEventId: string;
        error: string;
    };
};

export type ObserverGroup = {
    lowerBound: { id: string; type: 'inclusive' | 'exclusive' };
    eventHandler: (event: EventSourcingDBEvent) => Promise<void>;
    onHandlerError: (
        error: Error,
        event: EventSourcingDBEvent,
    ) => Promise<void>;
};

type ConsumerState = {
    consumer: ObserverConsumer;
    /** Last finished event id; null until the consumer finishes its first. */
    position: bigint | null;
    /** Position changed since the last flush. */
    pending: boolean;
    halted: boolean;
};

/** How long the stream has to go quiet before a burst is considered over. */
const BURST_IDLE_MS = 2000;

const describeError = (error: Error): Record<string, unknown> => {
    return {
        name: error.name,
        message: error.message,
        ...(error.stack !== undefined ? { stack: error.stack } : {}),
    };
};

const describeFailures = (
    failures: ReadonlyMap<string, Error>,
): Record<string, unknown> => {
    return Object.fromEntries(
        [...failures.entries()].map(([name, error]) => {
            return [name, describeError(error)];
        }),
    );
};

const failureSummary = (failures: ReadonlyMap<string, Error>): string => {
    return [...failures.entries()]
        .map(([name, error]) => {
            return `${name}: ${error.name}: ${error.message}`;
        })
        .join('; ');
};

type Burst = {
    startedAt: number;
    finishedAt: number;
    events: number;
    eventsApplied: number;
    firstEventId: string;
    lastEventId: string;
};

/**
 * Times contiguous runs of events and logs one summary per run, so a replay
 * reports as a single line instead of 12K of them. A run ends once the stream
 * has been quiet for {@link BURST_IDLE_MS}; the reported duration covers only
 * the events themselves, never the idle wait.
 */
const createBurstTimer = (observer: string) => {
    let burst: Burst | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const log = () => {
        if (burst === null) {
            return;
        }

        const durationMs = burst.finishedAt - burst.startedAt;
        const durationSeconds = Math.floor((durationMs / 1000) * 1000) / 1000;

        const { events, eventsApplied, firstEventId, lastEventId } = burst;
        burst = null;

        getLogger().debug({
            category: 'ESDB Observer',
            message: `Observer "${observer}" processed ${events} event(s) in ${durationSeconds}s`,
            data: {
                observer,
                events,
                eventsApplied,
                durationMs,
                eventsPerSecond:
                    durationMs > 0
                        ? Math.round((events / durationMs) * 1000)
                        : events,
                firstEventId,
                lastEventId,
            },
        });
    };

    const schedule = () => {
        if (timer !== undefined) {
            clearTimeout(timer);
        }

        const scheduled = setTimeout(() => {
            timer = undefined;

            // A single event slower than the idle window must not split its
            // own burst in two.
            if (inFlight) {
                schedule();
                return;
            }

            log();
        }, BURST_IDLE_MS);

        timer = scheduled;

        // Never hold the process open just to emit a timing line.
        scheduled.unref();
    };

    return {
        start: (eventId: string) => {
            inFlight = true;
            const now = Date.now();

            burst ??= {
                startedAt: now,
                finishedAt: now,
                events: 0,
                eventsApplied: 0,
                firstEventId: eventId,
                lastEventId: eventId,
            };

            burst.events += 1;
            burst.lastEventId = eventId;
        },
        finish: (applied: boolean) => {
            inFlight = false;

            if (burst !== null) {
                burst.finishedAt = Date.now();

                if (applied) {
                    burst.eventsApplied += 1;
                }
            }

            schedule();
        },
    };
};

/**
 * The lowest position in the group, since the observer has to resume far
 * enough back for every consumer. Consumers ahead of it skip the replayed
 * events in memory.
 */
const lowerBoundFor = (
    states: readonly ConsumerState[],
): ObserverGroup['lowerBound'] => {
    let lowest: bigint | null = null;

    for (const state of states) {
        if (state.position === null) {
            return { id: '0', type: 'inclusive' };
        }

        if (lowest === null || state.position < lowest) {
            lowest = state.position;
        }
    }

    return lowest === null
        ? { id: '0', type: 'inclusive' }
        : { id: lowest.toString(), type: 'exclusive' };
};

export type CreateObserverGroupOptions = {
    groupName: string;
    consumers: readonly ObserverConsumer[];
    checkpoints: ObserverCheckpointStore;
};

/**
 * Wires a set of consumers onto one EventSourcingDB observer.
 *
 * Consumers run sequentially in declaration order, so a consumer that reads
 * another's read model must be declared after it. Every non-halted consumer
 * advances its position on every event — handled or not — which keeps the
 * position contiguous and lets a restart resume exactly where it stopped.
 *
 * A consumer that throws holds its position while its siblings advance. The
 * handler then rethrows so the observer retries in place; on the retry the
 * advanced consumers skip themselves, so only the failing one runs again.
 * Once retries are exhausted the consumer is halted: it is skipped for the
 * rest of the process lifetime and its checkpoint stays at the last event it
 * finished, so a restart resumes at the event it could not apply.
 */
export const createObserverGroup = async ({
    groupName,
    consumers,
    checkpoints,
}: CreateObserverGroupOptions): Promise<ObserverGroup> => {
    const names = consumers.map((consumer) => {
        return consumer.name;
    });
    const stored = await checkpoints.getPositions(names);

    const states: ConsumerState[] = consumers.map((consumer) => {
        const position = stored.get(consumer.name);

        return {
            consumer,
            position: position === undefined ? null : BigInt(position),
            pending: false,
            halted: false,
        };
    });

    // Failures from the most recent handler attempt, read by onHandlerError
    // to know which consumers to halt.
    let lastFailures = new Map<string, Error>();

    const burstTimer = createBurstTimer(groupName);

    const flush = async (degraded?: {
        failedEventId: string;
        errors: ReadonlyMap<string, Error>;
    }) => {
        const updates: ObserverCheckpointUpdate[] = [];

        for (const state of states) {
            const failure = degraded?.errors.get(state.consumer.name);

            if (!state.pending && failure === undefined) {
                continue;
            }

            updates.push({
                name: state.consumer.name,
                observerGroup: groupName,
                ...(state.position !== null
                    ? { eventId: state.position.toString() }
                    : {}),
                ...(degraded !== undefined && failure !== undefined
                    ? {
                          degraded: {
                              failedEventId: degraded.failedEventId,
                              error: `${failure.name}: ${failure.message}`,
                          },
                      }
                    : {}),
            });
        }

        if (updates.length === 0) {
            return;
        }

        await checkpoints.savePositions(updates);

        for (const state of states) {
            state.pending = false;
        }
    };

    const eventHandler = async (eventSourcingDBEvent: EventSourcingDBEvent) => {
        const eventId = BigInt(eventSourcingDBEvent.id);
        const event = eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent);
        const failures = new Map<string, Error>();
        let applied = false;

        lastFailures = failures;
        burstTimer.start(eventSourcingDBEvent.id);

        try {
            for (const state of states) {
                if (state.halted) {
                    continue;
                }

                if (state.position !== null && eventId <= state.position) {
                    continue;
                }

                if (state.consumer.handles(event)) {
                    applied = true;

                    try {
                        // Declaration order: a later consumer reads the earlier projection.
                        const consumption =
                            state.consumer.apply(eventSourcingDBEvent);
                        await consumption; // NOSONAR
                    } catch (error) {
                        const failure = toError(error);
                        failures.set(state.consumer.name, failure);
                        getLogger().error({
                            category: 'ESDB Observer',
                            message: `Consumer "${state.consumer.name}" failed to apply event ${eventSourcingDBEvent.id} (${eventSourcingDBEvent.type})`,
                            error: failure,
                            data: {
                                observerGroup: groupName,
                                consumer: state.consumer.name,
                                eventId: eventSourcingDBEvent.id,
                                eventType: eventSourcingDBEvent.type,
                            },
                        });
                        continue;
                    }
                }

                state.position = eventId;
                state.pending = true;
            }

            await flush();
        } finally {
            burstTimer.finish(applied);
        }

        if (failures.size > 0) {
            const exception = new GenericException(
                `Observer "${groupName}" could not apply event ${eventSourcingDBEvent.id} to ${failureSummary(
                    failures,
                )}`,
                {
                    eventId: eventSourcingDBEvent.id,
                    eventType: eventSourcingDBEvent.type,
                    consumers: describeFailures(failures),
                },
            );
            const cause = [...failures.values()][0];

            if (cause !== undefined) {
                exception.cause = cause;
            }

            throw exception;
        }
    };

    const onHandlerError = async (
        error: Error,
        eventSourcingDBEvent: EventSourcingDBEvent,
    ) => {
        // An empty failure map means the handler broke outside a consumer
        // (event mapping or the checkpoint flush), leaving the whole group in
        // an unknown state — halt all of it.
        const errors =
            lastFailures.size > 0
                ? lastFailures
                : new Map(
                      states
                          .filter((state) => {
                              return !state.halted;
                          })
                          .map((state) => {
                              return [state.consumer.name, error];
                          }),
                  );

        for (const state of states) {
            if (errors.has(state.consumer.name)) {
                state.halted = true;
            }
        }

        const cause = errors.size === 1 ? [...errors.values()][0] : error;

        getLogger().critical({
            category: 'ESDB Observer',
            message: `Halted ${errors.size} consumer(s) of observer "${groupName}" at event ${eventSourcingDBEvent.id}. They stay at their checkpoint until the process restarts. ${failureSummary(
                errors,
            )}`,
            error: cause ?? error,
            data: {
                observerGroup: groupName,
                eventId: eventSourcingDBEvent.id,
                eventType: eventSourcingDBEvent.type,
                consumers: describeFailures(errors),
            },
        });

        await flush({ failedEventId: eventSourcingDBEvent.id, errors });
    };

    return { lowerBound: lowerBoundFor(states), eventHandler, onHandlerError };
};

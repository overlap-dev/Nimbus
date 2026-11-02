import {
    type CheckpointFailure,
    type CheckpointStore,
    type CheckpointUpdate,
    GenericException,
    getLogger,
} from '@nimbus-cqrs/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import type { ConsumerStatus, EventConsumer } from './eventConsumer.ts';
import { eventSourcingDBEventToNimbusEvent } from './eventMapping.ts';

/**
 * Where an observer starts reading the stream.
 */
export type Bound = {
    id: string;
    type: 'inclusive' | 'exclusive';
};

/**
 * Runs the consumers of one observer and keeps their checkpoints.
 */
export type ConsumerRunner = {
    /**
     * The lowest position of all consumers, from where the observer has
     * to resume so that every consumer sees what it still misses.
     */
    readonly lowerBound: Bound;
    /**
     * Offers one event to every consumer in declaration order. Rejects
     * when at least one consumer failed so the observer retries in place.
     */
    readonly handle: (raw: EventSourcingDBEvent) => Promise<void>;
    /**
     * Halts the consumers that failed on the most recent attempt and
     * persists their failure. Called once handler retries are exhausted.
     */
    readonly onExhausted: (
        error: Error,
        raw: EventSourcingDBEvent,
    ) => Promise<void>;
    /**
     * The current state of every consumer.
     */
    readonly status: () => ConsumerStatus[];
};

export type CreateConsumerRunnerOptions = {
    observer: string;
    consumers: readonly EventConsumer[];
    checkpointStore: CheckpointStore;
    head: string | null;
};

type ConsumerState = {
    consumer: EventConsumer;
    /** Last finished event id; null until the consumer finishes its first. */
    position: bigint | null;
    /** Position changed since the last flush. */
    pending: boolean;
    halted: boolean;
    failure?: CheckpointFailure;
};

/** How long the stream has to go quiet before a burst is considered over. */
const BURST_IDLE_MS = 2000;

const toError = (error: unknown): Error => {
    return error instanceof Error ? error : new Error(String(error));
};

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
    eventsHandled: number;
    firstEventId: string;
    lastEventId: string;
};

/**
 * Times contiguous runs of events and logs one summary per run, so a replay
 * reports as a single line instead of one per event. A run ends once the
 * stream has been quiet for {@link BURST_IDLE_MS}; the reported duration
 * covers only the events themselves, never the idle wait.
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

        const { events, eventsHandled, firstEventId, lastEventId } = burst;
        burst = null;

        getLogger().debug({
            category: 'Nimbus',
            message: `Observer "${observer}" processed ${events} event(s) in ${durationSeconds}s`,
            data: {
                observer,
                events,
                eventsHandled,
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
                eventsHandled: 0,
                firstEventId: eventId,
                lastEventId: eventId,
            };

            burst.events += 1;
            burst.lastEventId = eventId;
        },
        finish: (handled: boolean) => {
            inFlight = false;

            if (burst !== null) {
                burst.finishedAt = Date.now();

                if (handled) {
                    burst.eventsHandled += 1;
                }
            }

            schedule();
        },
    };
};

/**
 * The lowest position of all consumers. Consumers ahead of it skip the
 * replayed events in memory.
 */
const lowerBoundFor = (states: readonly ConsumerState[]): Bound => {
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

const startsFromHead = (consumer: EventConsumer): boolean => {
    return consumer.startFrom === 'head';
};

/**
 * Every consumer name has to be unique and every dependency has to name a
 * consumer declared earlier on the same observer. A consumer that resumes
 * from its checkpoint must not depend on one that starts from the head,
 * because that dependency never built state for older events.
 */
const validateConsumers = (
    observer: string,
    consumers: readonly EventConsumer[],
): void => {
    const declared = new Map<string, EventConsumer>();

    for (const consumer of consumers) {
        if (declared.has(consumer.name)) {
            throw new GenericException(
                `Observer "${observer}" declares consumer "${consumer.name}" more than once`,
                { observer, consumer: consumer.name },
            );
        }

        for (const dependency of consumer.dependsOn ?? []) {
            const declaredDependency = declared.get(dependency);

            if (declaredDependency === undefined) {
                throw new GenericException(
                    `Consumer "${consumer.name}" of observer "${observer}" depends on "${dependency}", which is not declared before it`,
                    { observer, consumer: consumer.name, dependency },
                );
            }

            if (
                !startsFromHead(consumer) &&
                startsFromHead(declaredDependency)
            ) {
                throw new GenericException(
                    `Consumer "${consumer.name}" of observer "${observer}" resumes from its checkpoint but depends on "${dependency}", which starts from the head and skips older events`,
                    { observer, consumer: consumer.name, dependency },
                );
            }
        }

        declared.set(consumer.name, consumer);
    }
};

/**
 * Wires the consumers of one observer onto a shared stream.
 *
 * Consumers run sequentially in declaration order. Every non-halted
 * consumer advances its position on every event — handled or not — which
 * keeps the position contiguous and lets a restart resume exactly where it
 * stopped.
 *
 * A consumer that throws holds its position while its siblings advance, as
 * does every consumer that depends on it. The handler then rejects so the
 * observer retries in place. On the next retry the advanced consumers skip
 * themselves, so only the failing ones run again. Once retries are
 * exhausted those consumers are halted. They are skipped for the rest of
 * the process lifetime and their checkpoint stays at the last event they
 * finished, so a restart resumes at the event they could not handle.
 *
 * Consumers with `startFrom: 'head'` ignore their stored position and
 * start at the head of the subject on every start. Their checkpoint is
 * still written like any other, so operators see where they are.
 */
export const createConsumerRunner = async ({
    observer,
    consumers,
    checkpointStore,
    head,
}: CreateConsumerRunnerOptions): Promise<ConsumerRunner> => {
    validateConsumers(observer, consumers);

    const names = consumers.map((consumer) => {
        return consumer.name;
    });

    const checkpoints = await checkpointStore.load(names);

    const positionFor = (consumer: EventConsumer): bigint | null => {
        if (startsFromHead(consumer)) {
            return head === null ? null : BigInt(head);
        }

        const position = checkpoints.get(consumer.name)?.position;

        return position === undefined ? null : BigInt(position);
    };

    const states: ConsumerState[] = consumers.map((consumer) => {
        const checkpoint = checkpoints.get(consumer.name);

        return {
            consumer,
            position: positionFor(consumer),
            pending: false,
            halted: false,
            ...(checkpoint?.failure !== undefined
                ? { failure: checkpoint.failure }
                : {}),
        };
    });

    const statesByName = new Map(
        states.map((state) => {
            return [state.consumer.name, state];
        }),
    );

    // Failures from the most recent handler attempt, read by onExhausted
    // to know which consumers to halt.
    let lastFailures = new Map<string, Error>();

    const burstTimer = createBurstTimer(observer);

    const flush = async (failed?: {
        position: string;
        errors: ReadonlyMap<string, Error>;
    }) => {
        const updates: CheckpointUpdate[] = [];
        const now = new Date().toISOString();

        for (const state of states) {
            const error = failed?.errors.get(state.consumer.name);

            if (!state.pending && error === undefined) {
                continue;
            }

            const failure =
                failed !== undefined && error !== undefined
                    ? {
                          position: failed.position,
                          error: `${error.name}: ${error.message}`,
                      }
                    : undefined;

            updates.push({
                consumer: state.consumer.name,
                observer,
                ...(state.position !== null
                    ? { position: state.position.toString() }
                    : {}),
                ...(failure !== undefined ? { failure } : {}),
            });

            if (failure !== undefined) {
                state.failure = { ...failure, at: now };
            }
        }

        if (updates.length === 0) {
            return;
        }

        await checkpointStore.save(updates);

        for (const state of states) {
            state.pending = false;
        }
    };

    const handle = async (raw: EventSourcingDBEvent) => {
        const eventId = BigInt(raw.id);
        const event = eventSourcingDBEventToNimbusEvent(raw);
        const failures = new Map<string, Error>();
        let handled = false;

        lastFailures = failures;
        burstTimer.start(raw.id);

        try {
            for (const state of states) {
                if (state.halted) {
                    continue;
                }

                if (state.position !== null && eventId <= state.position) {
                    continue;
                }

                const failedDependency = (state.consumer.dependsOn ?? []).find(
                    (dependency) => {
                        return (
                            failures.has(dependency) ||
                            statesByName.get(dependency)?.halted === true
                        );
                    },
                );

                if (failedDependency !== undefined) {
                    failures.set(
                        state.consumer.name,
                        new GenericException(
                            `Dependency "${failedDependency}" did not finish event ${raw.id}`,
                            { dependency: failedDependency },
                        ),
                    );
                    continue;
                }

                if (state.consumer.handles(event)) {
                    handled = true;

                    try {
                        // Declaration order: a later consumer reads the earlier projection.
                        const consumption = state.consumer.handle(event, raw);
                        await consumption; // NOSONAR
                    } catch (error) {
                        const failure = toError(error);
                        failures.set(state.consumer.name, failure);
                        getLogger().error({
                            category: 'Nimbus',
                            message: `Consumer "${state.consumer.name}" failed to handle event ${raw.id} (${raw.type})`,
                            error: failure,
                            data: {
                                observer,
                                consumer: state.consumer.name,
                                eventId: raw.id,
                                eventType: raw.type,
                            },
                            correlationId: event.correlationid,
                        });
                        continue;
                    }
                }

                state.position = eventId;
                state.pending = true;
                state.failure = undefined;
            }

            await flush();
        } finally {
            burstTimer.finish(handled);
        }

        if (failures.size > 0) {
            const exception = new GenericException(
                `Observer "${observer}" could not handle event ${raw.id} for ${failureSummary(
                    failures,
                )}`,
                {
                    eventId: raw.id,
                    eventType: raw.type,
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

    const onExhausted = async (error: Error, raw: EventSourcingDBEvent) => {
        // An empty failure map means the handler broke outside a consumer
        // (event mapping or the checkpoint flush), leaving the whole
        // observer in an unknown state — halt all of it.
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
            category: 'Nimbus',
            message: `Halted ${errors.size} consumer(s) of observer "${observer}" at event ${raw.id}. They stay at their checkpoint until the process restarts. ${failureSummary(
                errors,
            )}`,
            error: cause ?? error,
            data: {
                observer,
                eventId: raw.id,
                eventType: raw.type,
                consumers: describeFailures(errors),
            },
        });

        await flush({ position: raw.id, errors });
    };

    const status = (): ConsumerStatus[] => {
        return states.map((state) => {
            return {
                name: state.consumer.name,
                position:
                    state.position === null ? null : state.position.toString(),
                halted: state.halted,
                ...(state.failure !== undefined
                    ? { failure: { ...state.failure } }
                    : {}),
            };
        });
    };

    return { lowerBound: lowerBoundFor(states), handle, onExhausted, status };
};

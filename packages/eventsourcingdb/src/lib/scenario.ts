import { assertEquals } from '@std/assert';
import type { Event } from '@nimbus/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';

/**
 * The result of executing a command in a {@link Scenario}.
 *
 * Provides assertion methods to verify the outcome of the command,
 * either by checking the emitted events or by asserting that an
 * error was thrown.
 *
 * @example
 * ```ts
 * scenario
 *     .when((state) => inviteUser(state, command))
 *     .then([{ type: 'UserInvited', data: { email: 'jane@example.com' } }]);
 * ```
 */
export class ThenResult {
    #events: Event[] | undefined;
    #error: Error | undefined;

    constructor(handleCommand: () => Event[]) {
        try {
            this.#events = handleCommand();
        } catch (error) {
            this.#error = error as Error;
        }
    }

    /**
     * Assert that the command produced the expected events.
     *
     * Each expected event is matched by index against the actual events.
     * Only the fields present in the expected event are compared, so you
     * can assert on a subset of fields.
     *
     * @param expectedEvents - The expected events to compare against.
     *
     * @throws If the command threw an error instead of returning events.
     * @throws If the number of events does not match.
     * @throws If any of the compared fields differ.
     */
    then(expectedEvents: Partial<Event>[]): void {
        if (this.#error) {
            throw this.#error;
        }

        assertEquals(this.#events!.length, expectedEvents.length);

        for (let i = 0; i < expectedEvents.length; i++) {
            const actual = this.#events![i];
            const expected = expectedEvents[i];

            if (expected.type !== undefined) {
                assertEquals(actual.type, expected.type);
            }
            if (expected.data !== undefined) {
                for (
                    const [key, value] of Object.entries(
                        expected.data as Record<string, unknown>,
                    )
                ) {
                    assertEquals(
                        (actual.data as Record<string, unknown>)[key],
                        value,
                    );
                }
            }
            if (expected.subject !== undefined) {
                assertEquals(actual.subject, expected.subject);
            }
            if (expected.source !== undefined) {
                assertEquals(actual.source, expected.source);
            }
        }
    }

    /**
     * Assert that the command threw an error with the given error code.
     *
     * The error code is expected to be found in the `details.errorCode`
     * property of the thrown error.
     *
     * @param errorCode - The expected error code.
     *
     * @throws If no error was thrown by the command.
     * @throws If the error code does not match.
     */
    thenThrows(errorCode: string): void {
        if (!this.#error) {
            throw new Error(
                `Expected an error with code '${errorCode}' but none was thrown`,
            );
        }

        const details = (this.#error as Error & {
            details?: Record<string, unknown>;
        }).details;

        assertEquals(details?.errorCode, errorCode);
    }
}

/**
 * A test scenario for command handlers in an event-sourced domain.
 *
 * Follows the Given/When/Then pattern:
 * - **given**: Replay past events to build up the state.
 * - **when**: Execute a command against the current state.
 * - **then** / **thenThrows**: Assert the outcome.
 *
 * @typeParam TState - The type of the domain state.
 *
 * @example
 * ```ts
 * import { createScenario } from '@nimbus/eventsourcingdb';
 *
 * const scenario = createScenario<MyState>(
 *     { id: 'test-id' },
 *     applyEventToMyState,
 * );
 *
 * scenario
 *     .given([somePastEvent])
 *     .when((state) => handleCommand(state, someCommand))
 *     .then([{ type: 'SomethingHappened' }]);
 * ```
 */
export class Scenario<TState> {
    #state: TState;
    #applyEvent: (state: TState, event: EventSourcingDBEvent) => TState;

    constructor(
        initialState: TState,
        applyEvent: (state: TState, event: EventSourcingDBEvent) => TState,
    ) {
        this.#state = initialState;
        this.#applyEvent = applyEvent;
    }

    /**
     * Replay past events to build up the domain state.
     *
     * @param events - The events to replay.
     * @returns The scenario instance for chaining.
     */
    given(events: Event[]): this {
        for (const event of events) {
            this.#state = this.#applyEvent(
                this.#state,
                event as unknown as EventSourcingDBEvent,
            );
        }

        return this;
    }

    /**
     * Execute a command against the current state.
     *
     * @param handleCommand - A function that receives the current state
     *     and returns the events produced by the command.
     * @returns A {@link ThenResult} to assert the outcome.
     */
    when(handleCommand: (state: TState) => Event[]): ThenResult {
        return new ThenResult(() => handleCommand(this.#state));
    }
}

/**
 * Create a new test scenario for an event-sourced domain.
 *
 * This is the recommended entry point for setting up Given/When/Then
 * style tests for command handlers.
 *
 * @typeParam TState - The type of the domain state.
 * @param initialState - The initial state before any events are applied.
 * @param applyEvent - A function that folds an event into the state.
 * @returns A new {@link Scenario} instance.
 *
 * @example
 * ```ts
 * import { createScenario } from '@nimbus/eventsourcingdb';
 *
 * const userScenario = () =>
 *     createScenario<UserState>(
 *         { id: 'test-user-id' },
 *         applyEventToUserState,
 *     );
 * ```
 */
export const createScenario = <TState>(
    initialState: TState,
    applyEvent: (state: TState, event: EventSourcingDBEvent) => TState,
): Scenario<TState> => new Scenario(initialState, applyEvent);

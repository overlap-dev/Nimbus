import { metrics, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import EventEmitter from 'node:events';
import { GenericException } from '../exception/genericException.ts';
import { getLogger } from '../log/logger.ts';
import type { Event } from '../message/event.ts';

const tracer = trace.getTracer('nimbus');
const meter = metrics.getMeter('nimbus');

const eventsPublishedCounter = meter.createCounter(
    'eventbus_events_published_total',
    {
        description: 'Total number of events published to the event bus',
    },
);

const eventsDeliveredCounter = meter.createCounter(
    'eventbus_events_delivered_total',
    {
        description: 'Total number of events delivered to handlers',
    },
);

const handlingDuration = meter.createHistogram(
    'eventbus_event_handling_duration_seconds',
    {
        description: 'Duration of event handler execution in seconds',
        unit: 's',
    },
);

const retryAttemptsCounter = meter.createCounter(
    'eventbus_retry_attempts_total',
    {
        description: 'Total number of retry attempts for event handling',
    },
);

const eventSizeBytes = meter.createHistogram(
    'eventbus_event_size_bytes',
    {
        description: 'Size of events published to the event bus in bytes',
        unit: 'By',
    },
);

/**
 * The type for the NimbusEventBus options.
 */
export type NimbusEventBusOptions = {
    /**
     * The name of the event bus instance for metrics and traces.
     * Defaults to 'default'.
     */
    name?: string;
    /**
     * The maximum number of retries for handling the event in case of an error.
     * Defaults to 2.
     */
    maxRetries?: number;
    /**
     * The base delay for exponential backoff in milliseconds.
     * Defaults to 1000ms.
     */
    baseDelay?: number;
    /**
     * The maximum delay cap for exponential backoff in milliseconds.
     * Defaults to 30000ms (30 seconds).
     */
    maxDelay?: number;
    /**
     * Whether to add jitter to the retry delay to prevent thundering herd issues.
     * Defaults to true.
     */
    useJitter?: boolean;
    /**
     * Optional callback invoked when an event is published.
     * Useful for custom logging or debugging.
     */
    logPublish?: (event: Event) => void;
};

/**
 * The input type for subscribing to an event.
 */
export type SubscribeEventInput<TEvent extends Event> = {
    /**
     * The CloudEvents event type to subscribe to (e.g., 'at.overlap.nimbus.order-created').
     */
    type: string;
    /**
     * The async handler function that processes received events.
     */
    handler: (event: TEvent) => Promise<void>;
    /**
     * Optional error callback invoked when event handling fails after all retries.
     * If not provided, errors are logged using the default logger.
     */
    onError?: (error: Error, event: TEvent) => void;
    /**
     * Optional retry options that override the EventBus defaults for this subscription.
     */
    options?: Omit<NimbusEventBusOptions, 'name'>;
};

/**
 * The NimbusEventBus is used to publish and subscribe to events within the application.
 *
 * Events are delivered asynchronously to all registered handlers. If a handler fails,
 * it will be retried using exponential backoff until it succeeds or the maximum retry
 * count is reached.
 *
 * All operations are instrumented with OpenTelemetry tracing and metrics for observability.
 *
 * @example
 * ```ts
 * import { createEvent, NimbusEventBus } from '@nimbus/core';
 *
 * const eventBus = new NimbusEventBus({
 *     name: 'orders',
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     maxDelay: 30000,
 *     useJitter: true,
 *     logPublish: (event) => {
 *         console.log('Event published:', event.type, event.correlationid);
 *     },
 * });
 *
 * // Subscribe to events
 * eventBus.subscribeEvent({
 *     type: 'at.overlap.nimbus.order-created',
 *     handler: async (event) => {
 *         console.log('Order created:', event.data);
 *     },
 *     onError: (error, event) => {
 *         console.error('Failed to handle event:', event.id, error.message);
 *     },
 *     options: {
 *         maxRetries: 5,
 *         baseDelay: 500,
 *         maxDelay: 15000,
 *         useJitter: true,
 *     },
 * });
 *
 * // Publish an event
 * const event = createEvent({
 *     type: 'at.overlap.nimbus.order-created',
 *     source: 'https://api.example.com',
 *     correlationid: '550e8400-e29b-41d4-a716-446655440000',
 *     subject: '/orders/12345',
 *     data: { orderId: '12345', customerId: '67890' },
 *     datacontenttype: 'application/json',
 * });
 *
 * eventBus.putEvent(event);
 * ```
 */
export class NimbusEventBus {
    private readonly _eventEmitter: EventEmitter;
    private readonly _name: string;
    private readonly _maxRetries: number;
    private readonly _baseDelay: number;
    private readonly _maxDelay: number;
    private readonly _useJitter: boolean;
    private readonly _logPublish?: (event: Event) => void;

    /**
     * Create a new NimbusEventBus instance.
     *
     * @param options - The options for the event bus.
     * @param options.name - The name of the event bus instance for metrics and traces. Defaults to 'default'.
     * @param options.maxRetries - The maximum number of retries for handling the event in case of an error. Defaults to 2.
     * @param options.baseDelay - The base delay for exponential backoff in milliseconds. Defaults to 1000ms.
     * @param options.maxDelay - The maximum delay cap for exponential backoff in milliseconds. Defaults to 30000ms.
     * @param options.useJitter - Whether to add jitter to the retry delay. Defaults to true.
     * @param options.logPublish - Optional callback invoked when an event is published.
     *
     * @example
     * ```ts
     * import { getLogger, NimbusEventBus } from '@nimbus/core';
     *
     * const eventBus = new NimbusEventBus({
     *     name: 'orders',
     *     maxRetries: 3,
     *     baseDelay: 1000,
     *     maxDelay: 30000,
     *     useJitter: true,
     *     logPublish: (event) => {
     *         getLogger().debug({
     *             category: 'EventBus',
     *             message: 'Published event',
     *             data: { type: event.type, id: event.id },
     *             correlationId: event.correlationid,
     *         });
     *     },
     * });
     * ```
     */
    constructor(options?: NimbusEventBusOptions) {
        this._eventEmitter = new EventEmitter();
        this._name = options?.name ?? 'default';
        this._maxRetries = options?.maxRetries ?? 2;
        this._baseDelay = options?.baseDelay ?? 1000;
        this._maxDelay = options?.maxDelay ?? 30000;
        this._useJitter = options?.useJitter ?? true;
        this._logPublish = options?.logPublish;
    }

    /**
     * Publish an event to the event bus.
     *
     * The event is validated against the CloudEvents 64KB size limit before publishing.
     * All subscribers registered for this event type will receive the event asynchronously.
     *
     * @param event - The CloudEvents-compliant event to publish.
     * @throws {GenericException} If the event size exceeds 64KB.
     *
     * @example
     * ```ts
     * import { createEvent, getEventBus } from '@nimbus/core';
     *
     * const eventBus = getEventBus('default');
     *
     * // Create and publish an event with all CloudEvents properties
     * const event = createEvent({
     *     type: 'at.overlap.nimbus.order-created',
     *     source: 'https://api.example.com',
     *     correlationid: '550e8400-e29b-41d4-a716-446655440000',
     *     subject: '/orders/12345',
     *     data: {
     *         orderId: '12345',
     *         customerId: '67890',
     *         items: ['item-1', 'item-2'],
     *         total: 99.99,
     *     },
     *     datacontenttype: 'application/json',
     *     dataschema: 'https://schemas.example.com/order-created.json',
     * });
     *
     * eventBus.putEvent(event);
     * ```
     */
    public putEvent<TEvent extends Event>(event: TEvent): void {
        const eventSize = this._validateEventSize(event);
        const metricLabels = {
            eventbus_name: this._name,
            event_type: event.type,
        };

        tracer.startActiveSpan(
            'eventbus.publish',
            {
                kind: SpanKind.PRODUCER,
                attributes: {
                    'messaging.system': 'nimbusEventBus',
                    'messaging.eventbus_name': this._name,
                    'messaging.operation': 'publish',
                    'messaging.destination': event.type,
                    'cloudevents.event_id': event.id,
                    'cloudevents.event_source': event.source,
                    ...(event.correlationid && {
                        correlation_id: event.correlationid,
                    }),
                },
            },
            (span) => {
                try {
                    eventsPublishedCounter.add(1, metricLabels);
                    eventSizeBytes.record(eventSize, metricLabels);

                    if (this._logPublish) {
                        this._logPublish(event);
                    }

                    this._eventEmitter.emit(event.type, event);
                } catch (error) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error instanceof Error
                            ? error.message
                            : 'Unknown error',
                    });
                    span.recordException(
                        error instanceof Error
                            ? error
                            : new Error('Unknown error'),
                    );
                    throw error;
                } finally {
                    span.end();
                }
            },
        );
    }

    /**
     * Subscribe to an event type with a handler function.
     *
     * When an event matching the specified type is published, the handler is invoked.
     * If the handler throws an error, it will be retried using exponential backoff
     * (delay doubles with each attempt) until either it succeeds or the maximum retry
     * count is reached.
     *
     * @param input - The subscription configuration.
     * @param input.type - The CloudEvents event type to subscribe to.
     * @param input.handler - The async handler function to process events.
     * @param input.onError - Optional callback invoked when all retries are exhausted.
     * @param input.options - Optional retry options to override EventBus defaults.
     * @param input.options.maxRetries - Override maximum retry attempts for this subscription.
     * @param input.options.baseDelay - Override base delay in milliseconds for this subscription.
     * @param input.options.maxDelay - Override maximum delay cap in milliseconds for this subscription.
     * @param input.options.useJitter - Override jitter setting for this subscription.
     *
     * @example
     * ```ts
     * import { getEventBus, getLogger } from '@nimbus/core';
     *
     * const eventBus = getEventBus('default');
     *
     * // Subscribe with all available options
     * eventBus.subscribeEvent({
     *     type: 'at.overlap.nimbus.order-created',
     *     handler: async (event) => {
     *         // Process the event
     *         console.log('Order created:', event.data.orderId);
     *         console.log('Correlation ID:', event.correlationid);
     *     },
     *     onError: (error, event) => {
     *         getLogger().error({
     *             category: 'OrderHandler',
     *             message: 'Failed to process order after all retries',
     *             data: { eventId: event.id, orderId: event.data.orderId },
     *             error,
     *             correlationId: event.correlationid,
     *         });
     *     },
     *     options: {
     *         maxRetries: 5,
     *         baseDelay: 500,
     *         maxDelay: 15000,
     *         useJitter: true,
     *     },
     * });
     * ```
     */
    public subscribeEvent<TEvent extends Event>({
        type,
        handler,
        onError,
        options,
    }: SubscribeEventInput<TEvent>): void {
        getLogger().info({
            category: 'Nimbus',
            message: `Subscribed to ${type} event`,
        });

        const maxRetries = options?.maxRetries ?? this._maxRetries;
        const baseDelay = options?.baseDelay ?? this._baseDelay;
        const maxDelay = options?.maxDelay ?? this._maxDelay;
        const useJitter = options?.useJitter ?? this._useJitter;

        const handleEvent = async (event: TEvent) => {
            try {
                await this._processEvent<TEvent>(
                    handler,
                    event,
                    maxRetries,
                    baseDelay,
                    maxDelay,
                    useJitter,
                );
            } catch (error: any) {
                if (onError) {
                    onError(error, event);
                } else {
                    getLogger().error({
                        category: 'Nimbus',
                        message: error.message,
                        error,
                    });
                }
            }
        };

        this._eventEmitter.on(type, handleEvent);
    }

    private _processEvent<TEvent extends Event>(
        handler: (event: TEvent) => Promise<void>,
        event: TEvent,
        maxRetries: number,
        baseDelay: number,
        maxDelay: number,
        useJitter: boolean,
    ): Promise<void> {
        const startTime = performance.now();
        const metricLabels = {
            eventbus_name: this._name,
            event_type: event.type,
        };

        return tracer.startActiveSpan(
            'eventbus.handle',
            {
                kind: SpanKind.CONSUMER,
                attributes: {
                    'messaging.system': 'nimbusEventBus',
                    'messaging.eventbus_name': this._name,
                    'messaging.operation': 'process',
                    'messaging.destination': event.type,
                    'cloudevents.event_id': event.id,
                    'cloudevents.event_source': event.source,
                    ...(event.correlationid && {
                        correlation_id: event.correlationid,
                    }),
                },
            },
            async (span) => {
                let attempt = 0;

                while (attempt <= maxRetries) {
                    try {
                        await handler(event);

                        this._recordDeliveryMetrics(
                            metricLabels,
                            'success',
                            startTime,
                        );

                        span.end();
                        return;
                    } catch (error: unknown) {
                        attempt++;

                        if (attempt > maxRetries) {
                            this._handleFinalFailure({
                                error,
                                event,
                                span,
                                metricLabels,
                                startTime,
                                retryConfig: {
                                    maxRetries,
                                    baseDelay,
                                    maxDelay,
                                },
                            });
                        }

                        retryAttemptsCounter.add(1, metricLabels);

                        const delayMs = this._calculateRetryDelay(
                            attempt,
                            baseDelay,
                            maxDelay,
                            useJitter,
                        );

                        span.addEvent('retry', { attempt, delay_ms: delayMs });

                        await new Promise((resolve) =>
                            setTimeout(resolve, delayMs)
                        );
                    }
                }
            },
        );
    }

    private _recordDeliveryMetrics(
        metricLabels: { eventbus_name: string; event_type: string },
        status: 'success' | 'error',
        startTime: number,
    ): void {
        eventsDeliveredCounter.add(1, { ...metricLabels, status });
        handlingDuration.record(
            (performance.now() - startTime) / 1000,
            metricLabels,
        );
    }

    private _handleFinalFailure(options: {
        error: unknown;
        event: Event;
        span: ReturnType<typeof tracer.startSpan>;
        metricLabels: { eventbus_name: string; event_type: string };
        startTime: number;
        retryConfig: {
            maxRetries: number;
            baseDelay: number;
            maxDelay: number;
        };
    }): never {
        const { error, event, span, metricLabels, startTime, retryConfig } =
            options;

        this._recordDeliveryMetrics(metricLabels, 'error', startTime);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error';
        const errorInstance = error instanceof Error
            ? error
            : new Error('Unknown error');

        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
        span.recordException(errorInstance);
        span.end();

        const exception = new GenericException(
            `Failed to handle event: ${event.type} from ${event.source}`,
            retryConfig,
        );

        if (error instanceof Error && error.stack) {
            exception.stack = error.stack;
        }

        throw exception;
    }

    private _calculateRetryDelay(
        attempt: number,
        baseDelay: number,
        maxDelay: number,
        useJitter: boolean,
    ): number {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitter = useJitter ? Math.random() * delay * 0.1 : 0;
        return delay + jitter;
    }

    /**
     * Validate the size of the event and return the size in bytes.
     *
     * To comply with the CloudEvent spec a transmitted event
     * can only have a maximum size of 64KB.
     *
     * @param event - The event to validate.
     * @returns The size of the event in bytes.
     */
    private _validateEventSize(event: Event): number {
        const eventJson = JSON.stringify(event);
        const size = new TextEncoder().encode(eventJson).length;
        const maxSizeBytes = 64 * 1024; // 64KB

        if (size > maxSizeBytes) {
            throw new GenericException(
                `Event size exceeds the limit of 64KB`,
                {
                    eventType: event.type,
                    eventSource: event.source,
                    eventSizeBytes: size,
                    maxSizeBytes,
                },
            );
        }

        return size;
    }
}

/**
 * Registry to store named EventBus instances.
 */
const eventBusRegistry = new Map<string, NimbusEventBus>();

/**
 * Setup a named EventBus instance and register it for later retrieval.
 *
 * Use this function to configure an EventBus with specific options at application
 * startup, then retrieve it later using {@link getEventBus}.
 *
 * @param name - The unique name for this EventBus instance.
 * @param options - Optional configuration options for the EventBus.
 * @param options.maxRetries - The maximum number of retries for handling events. Defaults to 2.
 * @param options.baseDelay - The base delay for exponential backoff in milliseconds. Defaults to 1000ms.
 * @param options.maxDelay - The maximum delay cap for exponential backoff in milliseconds. Defaults to 30000ms.
 * @param options.useJitter - Whether to add jitter to the retry delay. Defaults to true.
 * @param options.logPublish - Optional callback invoked when an event is published.
 *
 * @example
 * ```ts
 * import { getLogger, setupEventBus } from '@nimbus/core';
 *
 * // At application startup, configure the event bus with all options
 * setupEventBus('default', {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     maxDelay: 30000,
 *     useJitter: true,
 *     logPublish: (event) => {
 *         getLogger().debug({
 *             category: 'EventBus',
 *             message: 'Published event',
 *             data: { type: event.type, id: event.id },
 *             correlationId: event.correlationid,
 *         });
 *     },
 * });
 * ```
 */
export const setupEventBus = (
    name: string,
    options?: Omit<NimbusEventBusOptions, 'name'>,
): void => {
    eventBusRegistry.set(name, new NimbusEventBus({ ...options, name }));
};

/**
 * Get a named EventBus instance.
 *
 * If an EventBus with the given name has been configured via {@link setupEventBus},
 * that instance is returned. Otherwise, a new EventBus with default options is created
 * and registered.
 *
 * @param name - The name of the EventBus instance to retrieve. Defaults to 'default'.
 * @returns The NimbusEventBus instance.
 *
 * @example
 * ```ts
 * import { createEvent, getEventBus } from '@nimbus/core';
 *
 * // Get the event bus configured earlier with setupEventBus
 * const eventBus = getEventBus('default');
 *
 * // Subscribe to events
 * eventBus.subscribeEvent({
 *     type: 'at.overlap.nimbus.order-created',
 *     handler: async (event) => {
 *         console.log('Order created:', event.data.orderId);
 *     },
 * });
 *
 * // Publish an event
 * const event = createEvent({
 *     type: 'at.overlap.nimbus.order-created',
 *     source: 'https://api.example.com',
 *     correlationid: '550e8400-e29b-41d4-a716-446655440000',
 *     data: { orderId: '12345', customerId: '67890' },
 *     datacontenttype: 'application/json',
 * });
 *
 * eventBus.putEvent(event);
 * ```
 */
export const getEventBus = (name: string = 'default'): NimbusEventBus => {
    let eventBus = eventBusRegistry.get(name);

    if (!eventBus) {
        eventBus = new NimbusEventBus({ name });
        eventBusRegistry.set(name, eventBus);
    }

    return eventBus;
};

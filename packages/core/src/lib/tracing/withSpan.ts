import {
    type Attributes,
    context,
    type Span,
    SpanKind,
    SpanStatusCode,
    trace,
} from '@opentelemetry/api';

/**
 * Options for configuring a span created by withSpan.
 */
export type WithSpanOptions = {
    /**
     * The name of the span. This will be displayed in your tracing UI.
     */
    name: string;
    /**
     * The name of the tracer. Defaults to "nimbus".
     */
    tracerName?: string;
    /**
     * The kind of span. Defaults to SpanKind.INTERNAL.
     */
    kind?: SpanKind;
    /**
     * Initial attributes to set on the span.
     */
    attributes?: Attributes;
};

/**
 * Higher-order function that wraps a function with OpenTelemetry tracing.
 *
 * Creates a child span within the current trace context. The span automatically:
 * - Inherits the parent span from the active context
 * - Records the function's execution time
 * - Sets error status and records exceptions on failure
 * - Ends when the function completes (success or failure)
 *
 * @example
 * ```ts
 * import { withSpan } from '@nimbus/core';
 *
 * const fetchUser = withSpan(
 *     {
 *         name: 'fetchUser',
 *         attributes: {
 *             'user.source': 'database'
 *         }
 *     },
 *     async (userId: string) => {
 *         return await db.users.findById(userId);
 *     }
 * );
 *
 * const user = await fetchUser('123');
 * ```
 *
 * @example
 * ```ts
 * const processOrder = withSpan(
 *     { name: 'processOrder' },
 *     async (orderId: string, span: Span) => {
 *         const order = await db.orders.findById(orderId);
 *
 *         span.setAttribute('order.total', order.total);
 *         span.setAttribute('order.items', order.items.length);
 *
 *         return await processPayment(order);
 *     }
 * );
 * ```
 */
export const withSpan = <TArgs extends unknown[], TReturn>(
    options: WithSpanOptions,
    fn: (...args: [...TArgs, Span]) => TReturn,
): (...args: TArgs) => TReturn => {
    const tracerName = options.tracerName ?? 'nimbus';
    const tracer = trace.getTracer(tracerName);

    return (...args: TArgs): TReturn => {
        const parentContext = context.active();

        return tracer.startActiveSpan(
            options.name,
            {
                kind: options.kind ?? SpanKind.INTERNAL,
                attributes: options.attributes,
            },
            parentContext,
            (span) => {
                try {
                    const result = fn(...args, span);

                    // Handle promises
                    if (result instanceof Promise) {
                        return result
                            .then((value) => {
                                span.end();
                                return value;
                            })
                            .catch((err) => {
                                span.setStatus({
                                    code: SpanStatusCode.ERROR,
                                    message: (err as Error).message,
                                });
                                span.recordException(err as Error);
                                span.end();
                                throw err;
                            }) as TReturn;
                    }

                    span.end();
                    return result;
                } catch (err) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: (err as Error).message,
                    });
                    span.recordException(err as Error);
                    span.end();
                    throw err;
                }
            },
        ) as TReturn;
    };
};

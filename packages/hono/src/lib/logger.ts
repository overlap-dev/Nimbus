import type { MiddlewareHandler } from 'hono';
import { getLogger } from '@nimbus/core';
import {
    context,
    propagation,
    SpanKind,
    SpanStatusCode,
    trace,
} from '@opentelemetry/api';

/**
 * Options for configuring the hono logger middleware.
 */
export type LoggerOptions = {
    /**
     * Enable OpenTelemetry tracing for HTTP requests.
     * When enabled, the middleware creates spans for each request
     * and propagates trace context from incoming headers.
     */
    enableTracing?: boolean;
    /**
     * Optionally change the name of the tracer.
     * Defaults to "nimbus-hono".
     */
    tracerName?: string;
};

const humanize = (times: string[]) => {
    const [delimiter, separator] = [',', '.'];

    const orderTimes = times.map((v) =>
        v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + delimiter)
    );

    return orderTimes.join(separator);
};

const time = (start: number) => {
    const delta = Date.now() - start;
    return humanize([
        delta < 1000 ? delta + 'ms' : Math.round(delta / 1000) + 's',
    ]);
};

/**
 * Logger middleware for Hono with optional OpenTelemetry tracing.
 *
 * When tracing is enabled, the middleware:
 * - Extracts trace context from incoming request headers (traceparent/tracestate)
 * - Creates a server span for the HTTP request
 * - Makes the span active so child spans can be created in handlers
 * - Records HTTP method, path, and status code as span attributes
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { logger } from '@nimbus/hono';
 *
 * const app = new Hono();
 * app.use(logger({ enableTracing: true }));
 * ```
 */
export const logger = (options?: LoggerOptions): MiddlewareHandler => {
    const tracerName = options?.tracerName ?? 'nimbus-hono';
    const tracer = trace.getTracer(tracerName);

    return async (c, next) => {
        const startTime = Date.now();

        getLogger().info({
            category: 'API',
            message: `REQ: [${c.req.method}] ${c.req.path}`,
        });

        if (options?.enableTracing) {
            // Extract trace context from incoming headers (traceparent, tracestate)
            const parentContext = propagation.extract(
                context.active(),
                c.req.raw.headers,
                {
                    get: (headers, key) => headers.get(key) ?? undefined,
                    keys: (headers) => [...headers.keys()],
                },
            );

            // Run the request within the extracted context
            await context.with(parentContext, async () => {
                await tracer.startActiveSpan(
                    `HTTP ${c.req.method} ${c.req.path}`,
                    {
                        kind: SpanKind.SERVER,
                        attributes: {
                            'http.method': c.req.method,
                            'url.path': c.req.path,
                            'http.target': c.req.url,
                        },
                    },
                    async (span) => {
                        try {
                            await next();
                            span.setAttribute('http.status_code', c.res.status);
                            if (c.res.status >= 400) {
                                span.setStatus({ code: SpanStatusCode.ERROR });
                            }
                        } catch (err) {
                            span.setStatus({
                                code: SpanStatusCode.ERROR,
                                message: (err as Error).message,
                            });
                            span.recordException(err as Error);
                            throw err;
                        } finally {
                            span.end();
                        }
                    },
                );
            });
        } else {
            await next();
        }

        getLogger().info({
            category: 'API',
            message: `RES: [${c.req.method}] ${c.req.path} - ${
                time(startTime)
            }`,
        });
    };
};

/**
 * Bridge between the OpenTelemetry bootstrap (`otel.ts`, preloaded with
 * `node --import`) and the application's graceful shutdown in `main.ts`.
 *
 * `otel.ts` registers the SDK shutdown here and `main.ts` awaits it after the
 * HTTP server and database connections have been drained, so the final spans
 * and metrics are flushed before the process exits. When the application is
 * started without the bootstrap the hook is a no-op.
 */

let shutdownHook: () => Promise<void> = async () => {};

/**
 * Registers the function that flushes and shuts down the telemetry SDK.
 */
export const setTelemetryShutdown = (hook: () => Promise<void>) => {
    shutdownHook = hook;
};

/**
 * Flushes and shuts down the telemetry SDK, if one was registered.
 */
export const shutdownTelemetry = () => shutdownHook();

/**
 * OpenTelemetry bootstrap for Node.js.
 *
 * Load this module before the application code with
 * `node --import ./src/otel.ts src/main.ts` so the SDK registers the global
 * tracer, meter and logger providers before any Nimbus package creates its
 * instruments.
 *
 * The SDK is configured entirely through the standard `OTEL_*` environment
 * variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`,
 * `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, ...), see
 * `start-with-otel.sh`.
 *
 * The SDK is not shut down on signals here. Instead `main.ts` awaits
 * `shutdownTelemetry()` after the application has drained, so spans from
 * in-flight requests are still exported and the final flush completes before
 * the process exits.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { setTelemetryShutdown } from './telemetry.ts';

const sdk = new NodeSDK();

sdk.start();

setTelemetryShutdown(() => sdk.shutdown());

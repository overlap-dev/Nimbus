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
 */

import process from 'node:process';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK();

sdk.start();

const shutdown = () => {
    sdk.shutdown().catch((error: unknown) => {
        console.error('Error shutting down the OpenTelemetry SDK', error);
    });
};

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
process.once('beforeExit', shutdown);

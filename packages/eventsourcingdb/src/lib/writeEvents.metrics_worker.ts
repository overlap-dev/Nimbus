import { parentPort } from 'node:worker_threads';
import { metrics } from '@opentelemetry/api';
import {
    DataPointType,
    MeterProvider,
    MetricReader,
} from '@opentelemetry/sdk-metrics';

/**
 * The event size histogram is created when `tracing.ts` loads. Register the
 * provider before that import so recordings land on this reader.
 */
class CollectingMetricReader extends MetricReader {
    protected onShutdown(): Promise<void> {
        return Promise.resolve();
    }

    protected onForceFlush(): Promise<void> {
        return Promise.resolve();
    }
}

const reader = new CollectingMetricReader();
const provider = new MeterProvider({ readers: [reader] });

if (!metrics.setGlobalMeterProvider(provider)) {
    throw new Error('Failed to register the test meter provider');
}

const { createEvent } = await import('@nimbus-cqrs/core');
const { Client } = await import('eventsourcingdb');
const { setupEventSourcingDBClient } = await import('./client.ts');
const { writeEvents } = await import('./writeEvents.ts');

Client.prototype.ping = () => Promise.resolve();
Client.prototype.verifyApiToken = () => Promise.resolve();
Client.prototype.writeEvents = () => Promise.resolve([]);

await setupEventSourcingDBClient({
    url: new URL('http://127.0.0.1:9'),
    apiToken: 'test-token',
});

await writeEvents([
    createEvent({
        source: 'https://nimbus.test',
        type: 'at.test.nimbus.issue-opened',
        subject: '/tenants/a/issues/1',
        data: { id: '1' },
    }),
    createEvent({
        source: 'https://nimbus.test',
        type: 'at.test.nimbus.scan-finished',
        subject: '/tenants/a/scans/2',
        data: { id: '2' },
    }),
]);

const collected = await reader.collect();
const collectedMetrics = collected.resourceMetrics.scopeMetrics.flatMap(
    (scope) => scope.metrics,
);
const eventSize = collectedMetrics.find(
    (metric) => metric.descriptor.name === 'eventsourcingdb_event_size_bytes',
);

const dataPoints =
    eventSize?.dataPointType === DataPointType.HISTOGRAM
        ? eventSize.dataPoints.map((point) => ({
              attributes: { ...point.attributes },
              count: point.value.count,
          }))
        : [];

parentPort?.postMessage({
    dataPoints,
    metricNames: collectedMetrics.map((metric) => metric.descriptor.name),
});

await provider.shutdown();

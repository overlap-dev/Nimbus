import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';

type EventSizeDataPoint = {
    attributes: Record<string, unknown>;
    count: number;
};

type WorkerResult = {
    dataPoints: EventSizeDataPoint[];
    metricNames: string[];
};

test('writeEvents records event size histogram data points without attributes', async () => {
    // The worker installs its own global MeterProvider before importing
    // `tracing.ts`, which is why this runs in a separate thread instead of
    // the test process.
    const worker = new Worker(
        new URL('./writeEvents.metrics_worker.ts', import.meta.url),
    );

    const result = await new Promise<WorkerResult>((resolve, reject) => {
        worker.once('message', (data: WorkerResult) => {
            resolve(data);
        });
        worker.once('error', (error) => {
            reject(error);
        });
        worker.once('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`metric worker exited with code ${code}`));
            }
        });
    });

    await worker.terminate();

    assert.deepEqual(
        result.metricNames.includes('eventsourcingdb_event_size_bytes'),
        true,
        `missing event size metric in [${result.metricNames.join(', ')}]`,
    );
    // Two events with different subjects and types collapse to one point
    // only when the histogram has no attributes.
    assert.deepEqual(result.dataPoints, [
        {
            attributes: {},
            count: 2,
        },
    ]);
});

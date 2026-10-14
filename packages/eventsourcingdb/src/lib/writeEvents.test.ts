import { assertEquals } from '@std/assert';

type EventSizeDataPoint = {
    attributes: Record<string, unknown>;
    count: number;
};

type WorkerResult = {
    dataPoints: EventSizeDataPoint[];
    metricNames: string[];
};

Deno.test('writeEvents records event size histogram data points without attributes', async () => {
    const worker = new Worker(
        new URL('./writeEvents.metrics_worker.ts', import.meta.url),
        { type: 'module' },
    );

    const result = await new Promise<WorkerResult>((resolve, reject) => {
        worker.addEventListener(
            'message',
            (event: MessageEvent<WorkerResult>) => {
                resolve(event.data);
            },
            { once: true },
        );
        worker.addEventListener('error', (event) => {
            reject(new Error(event.message || 'metric worker failed'));
        }, { once: true });
    });

    worker.terminate();

    assertEquals(
        result.metricNames.includes('eventsourcingdb_event_size_bytes'),
        true,
        `missing event size metric in [${result.metricNames.join(', ')}]`,
    );
    // Two events with different subjects and types collapse to one point
    // only when the histogram has no attributes.
    assertEquals(result.dataPoints, [{
        attributes: {},
        count: 2,
    }]);
});

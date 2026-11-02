import { getLogger } from '@nimbus-cqrs/core';
import { getMongoConnectionManager } from '@nimbus-cqrs/mongodb';
import { initMongoDB } from '../api/mongodb.ts';
import { checkpointStore } from '../api/shared/lib/eventsourcingdb/checkpoint-store.ts';
import { setupLogger } from '../logger.ts';

// Moves one consumer to the beginning of the event log or to a specific event position.
//
//   pnpm checkpoint:reset <consumer> [event-id]
//
// Without an event id the consumer replays the subject from the beginning
// on the next start. With event-id it resumes after that event. Either way the
// failure marker is cleared.
//
// Run it while the API is stopped. A running observer keeps the position
// in memory and overwrites the reset with its next checkpoint.

setupLogger();

const [consumer, position] = process.argv.slice(2);

try {
    if (consumer === undefined || consumer === '') {
        throw new Error('Usage: reset-checkpoint <consumer> [event-id]');
    }

    await initMongoDB();
    await checkpointStore.reset(consumer, position);

    process.exitCode = 0;

    getLogger().info({
        message:
            position === undefined
                ? `Checkpoint of "${consumer}" cleared. It replays from the beginning on the next start.`
                : `Checkpoint of "${consumer}" set to event ${position}. It resumes after that event on the next start.`,
    });
} catch (error) {
    getLogger().error({
        message: 'Failed to reset the checkpoint',
        error: error as Error,
    });
    process.exitCode = 1;
} finally {
    await getMongoConnectionManager('default').close();
}

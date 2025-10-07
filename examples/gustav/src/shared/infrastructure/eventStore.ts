import { getLogger } from '@nimbus/core';
import type { EventStoreSubscription } from '@nimbus/eventsourcing';
import { EventSourcingDBStore } from '@nimbus/eventsourcingdb';
import { getEnv } from '@nimbus/utils';
import {
    RecipeAddedCommandType,
    RecipeAddedEvent,
} from '../../contexts/recipe/core/events/recipeAdded.ts';
import {
    RecipeDeletedEvent,
    RecipeDeletedEventType,
} from '../../contexts/recipe/core/events/recipeDeleted.ts';
import {
    RecipeUpdatedEvent,
    RecipeUpdatedEventType,
} from '../../contexts/recipe/core/events/recipeUpdated.ts';
import { recipeAddedHandler } from '../../contexts/recipe/infrastructure/eventHandler/recipeAdded.handler.ts';
import { recipeDeletedHandler } from '../../contexts/recipe/infrastructure/eventHandler/recipeDeleted.handler.ts';
import { recipeUpdatedHandler } from '../../contexts/recipe/infrastructure/eventHandler/recipeUpdated.handler.ts';

export let eventStore: EventSourcingDBStore;
let subscription: EventStoreSubscription | undefined;

/**
 * Initialize the event store and start observing events.
 *
 * This sets up:
 * 1. Connection to EventSourcingDB
 * 2. Event observer that keeps read models in sync
 *
 * Pattern: EventStore (source of truth) → Observer → Read Model Updates
 */
export const initEventStore = async () => {
    const logger = getLogger();

    // 1. Initialize EventStore connection
    const { EVENTSOURCINGDB_API, EVENTSOURCINGDB_SECRET } = getEnv({
        variables: ['EVENTSOURCINGDB_API', 'EVENTSOURCINGDB_SECRET'],
    });

    eventStore = new EventSourcingDBStore({
        apiUrl: EVENTSOURCINGDB_API,
        secret: EVENTSOURCINGDB_SECRET,
    });

    logger.info({
        category: 'Gustav',
        message: 'EventStore initialized',
    });

    // 2. Start observing events to keep read models in sync
    logger.info({
        category: 'Gustav',
        message: 'Starting event observer for read model synchronization',
    });

    subscription = await eventStore.observe({
        subject: '/',
        recursive: true,
        // sinceEventId: '123', // Optional: Resume from checkpoint after restart
        handler: async (event) => {
            logger.debug({
                category: 'Gustav',
                message: `Processing event: ${event.type}`,
                data: {
                    eventId: event.eventstoremetadata.id,
                    subject: event.subject,
                },
            });

            // Route events to appropriate read model handlers
            switch (event.type) {
                case RecipeAddedCommandType:
                    await recipeAddedHandler(event as RecipeAddedEvent);
                    break;

                case RecipeUpdatedEventType:
                    await recipeUpdatedHandler(event as RecipeUpdatedEvent);
                    break;

                case RecipeDeletedEventType:
                    await recipeDeletedHandler(event as RecipeDeletedEvent);
                    break;

                default:
                    logger.debug({
                        category: 'Gustav',
                        message:
                            `No handler registered for event type: ${event.type}`,
                    });
            }
        },
        onError: (error, event) => {
            logger.error({
                category: 'Gustav',
                message: 'Failed to process event',
                error,
                data: {
                    eventType: event?.type,
                    eventId: event?.eventstoremetadata?.id,
                },
            });
        },
    });

    logger.info({
        category: 'Gustav',
        message: 'Event observer started successfully',
    });
};

/**
 * Cleanup event store observer on shutdown.
 */
export const stopEventStore = async () => {
    if (subscription) {
        await subscription.unsubscribe();
        getLogger().info({
            category: 'Gustav',
            message: 'Event observer stopped',
        });
    }
};

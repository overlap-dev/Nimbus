import {
    getEventSourcingDBClient,
    listEventObservers,
} from '@nimbus-cqrs/eventsourcingdb';
import { getMongoConnectionManager } from '@nimbus-cqrs/mongodb';

type HealthStatus = 'healthy' | 'error';

export type ApiHealth = {
    status: HealthStatus;
    http: HealthStatus;
    mongodb: HealthStatus;
    eventSourcingDB: HealthStatus;
    observers: HealthStatus;
};

export const checkApiHealth = async () => {
    const mongodbHealth =
        await getMongoConnectionManager('default').healthCheck();

    let eventSourcingDBHealth: HealthStatus = 'healthy';
    try {
        await getEventSourcingDBClient().ping();
    } catch (_error) {
        eventSourcingDBHealth = 'error';
    }

    // An observer reports an error once it gave up reconnecting or once one of
    // its consumers exhausted its retries and halted. MongoDB and
    // EventSourcingDB can be reachable while a projection is stuck, so the
    // observers get their own entry.
    const observersHealth: HealthStatus = listEventObservers().every(
        (observer) => {
            return observer.healthCheck().status === 'healthy';
        },
    )
        ? 'healthy'
        : 'error';

    let overallHealth: HealthStatus = 'healthy';
    if (
        mongodbHealth.status !== 'healthy' ||
        eventSourcingDBHealth !== 'healthy' ||
        observersHealth !== 'healthy'
    ) {
        overallHealth = 'error';
    }

    return {
        status: overallHealth,
        http: 'healthy',
        mongodb: mongodbHealth.status,
        eventSourcingDB: eventSourcingDBHealth,
        observers: observersHealth,
    };
};

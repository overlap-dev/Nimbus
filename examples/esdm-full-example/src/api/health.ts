import { getEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
import { getMongoConnectionManager } from '@nimbus-cqrs/mongodb';

type HealthStatus = 'healthy' | 'error';

export type ApiHealth = {
    status: HealthStatus;
    http: HealthStatus;
    mongodb: HealthStatus;
    eventSourcingDB: HealthStatus;
};

// TODO: When projections move into the framework, report halted
// consumers here. A consumer that exhausted its retries stays degraded
// while MongoDB and EventSourcingDB are still reachable, so this check
// currently stays healthy.
export const checkApiHealth = async () => {
    const mongodbHealth =
        await getMongoConnectionManager('default').healthCheck();

    let eventSourcingDBHealth: HealthStatus = 'healthy';
    try {
        await getEventSourcingDBClient().ping();
    } catch (_error) {
        eventSourcingDBHealth = 'error';
    }

    let overallHealth: HealthStatus = 'healthy';
    if (
        mongodbHealth.status !== 'healthy' ||
        eventSourcingDBHealth !== 'healthy'
    ) {
        overallHealth = 'error';
    }

    return {
        status: overallHealth,
        http: 'healthy',
        mongodb: mongodbHealth.status,
        eventSourcingDB: eventSourcingDBHealth,
    };
};

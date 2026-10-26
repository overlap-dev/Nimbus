import { getEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
import { getMongoConnectionManager } from '@nimbus-cqrs/mongodb';

type HealthStatus = 'healthy' | 'error';

export type ApiHealth = {
    status: HealthStatus;
    http: HealthStatus;
    mongodb: HealthStatus;
    eventSourcingDB: HealthStatus;
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

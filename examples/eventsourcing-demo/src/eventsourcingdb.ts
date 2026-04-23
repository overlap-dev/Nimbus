import { setupEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
import { getEnv } from '@nimbus-cqrs/utils';
import {
    getUserProjectionLowerBound,
    projectUsers,
} from './read/iam/users/projections/users.projection.ts';

export const initEventSourcingDB = async () => {
    const env = getEnv({
        variables: ['ESDB_URL', 'ESDB_API_TOKEN'],
    });

    // TODO: check retry logic for the observer it currently runs indefinitely
    // Test with lower bound passed as integer
    await setupEventSourcingDBClient(
        {
            url: new URL(env.ESDB_URL),
            apiToken: env.ESDB_API_TOKEN,
            eventObservers: [
                {
                    subject: '/',
                    recursive: true,
                    eventHandler: projectUsers,
                    lowerBound: await getUserProjectionLowerBound() as any,
                },
            ],
        },
    );
};

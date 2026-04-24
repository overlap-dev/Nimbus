import { getLogger } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { ObjectId } from 'mongodb';
import {
    isUserInvitationAcceptedEvent,
    UserInvitationAcceptedEvent,
} from '../../../../write/iam/users/core/events/userInvitationAccepted.event.ts';
import {
    isUserInvitedEvent,
    UserInvitedEvent,
} from '../../../../write/iam/users/core/events/userInvited.event.ts';
import { User } from './users.collection.ts';
import { userRepository } from './users.repository.ts';

// Here we define the "users" projection.
//
// This function is given to the EventSourcingDB client as an event observer.
// You can see this happen in the eventsourcingdb.ts file.
// For the EventSourcingDB observer we can specify a subject and all events
// with this subject will be passed to this function.
//
// We can then apply each event to the projection.
// In this example we use MongoDB to store the projection in a dedicated collection.
//
// This "users" projection is then used to feed different queries.

export const projectUsers = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
) => {
    getLogger().debug({
        category: 'ProjectUsers',
        message: `Projecting event ${eventSourcingDBEvent.type} to users.`,
    });

    // As we receive a raw EventSourcingDB event
    // we convert it back to a Nimbus event.

    const event = eventSourcingDBEventToNimbusEvent<
        UserInvitedEvent | UserInvitationAcceptedEvent
    >(
        eventSourcingDBEvent,
    );

    // Now we can apply the event to the projection
    // based on the type of the event.
    // This is just plain reducer logic.

    if (isUserInvitedEvent(event)) {
        const user: User = {
            _id: new ObjectId().toString(),
            id: event.data.id,
            revision: event.id,
            email: event.data.email,
            firstName: event.data.firstName,
            lastName: event.data.lastName,
            invitedAt: event.data.invitedAt,
            acceptedAt: null,
        };

        try {
            await userRepository.insertOne({ item: user });

            return;
        } catch (error) {
            getLogger().error({
                category: 'ProjectViews',
                message: `Could not project event ${event.type} to users view.`,
                error: error as Error,
            });

            return;
        }
    }

    if (isUserInvitationAcceptedEvent(event)) {
        try {
            await userRepository.updateOne({
                filter: { id: event.subject.split('/')[2] },
                update: {
                    $set: {
                        revision: event.id,
                        acceptedAt: new Date(event.data.acceptedAt),
                    },
                },
            });

            return;
        } catch (error) {
            getLogger().error({
                category: 'ProjectViews',
                message: `Could not project event ${event.type} to users view.`,
                error: error as Error,
            });

            return;
        }
    }

    // In case we receive an event type we do not reduce above
    // it is good to at least make this visible.

    getLogger().warn({
        category: 'ProjectViews',
        message: `Unknown event type ${(event as { type: string }).type}`,
    });
};

// As we use the EventSourcingDB client to observe all events
// on each application startup we do not want to re-project
// events we already processed.
//
// Therefore we use the revision field to determine the lower bound
// to tell the EventSourcingDB client that we want to get all new events
// up from the defined lower bound.

export const getUserProjectionLowerBound = async () => {
    const lastEventId = await userRepository.getLastProjectedEventId();

    return {
        id: lastEventId,
        type: lastEventId === '0' ? 'inclusive' : 'exclusive',
    };
};

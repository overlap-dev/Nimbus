import { type Event, getLogger } from '@nimbus-cqrs/core';
import type { EventConsumer } from '@nimbus-cqrs/eventsourcingdb';
import { ObjectId } from 'mongodb';
import { isUserInvitationAcceptedEvent } from '../../../../write/iam/users/core/events/userInvitationAccepted.event.ts';
import { isUserInvitedEvent } from '../../../../write/iam/users/core/events/userInvited.event.ts';
import type { User } from './users.collection.ts';
import { userRepository } from './users.repository.ts';

// Here we define the "users" projection.
//
// This function is the handler of an event consumer which is fed by an
// EventSourcingDB event observer.
// You can see this happen in the eventsourcingdb.ts file.
// For the EventSourcingDB observer we can specify a subject and all events
// with this subject will be passed to this function. The observer already
// converted the raw EventSourcingDB event back to a Nimbus event for us.
//
// We can then apply each event to the projection.
// In this example we use MongoDB to store the projection in a dedicated collection.
//
// This "users" projection is then used to feed different queries.
//
// We do not catch errors in here. In case an event can not be projected
// the observer retries it. If it still fails the observer halts this
// consumer and keeps its checkpoint on the last event it successfully processed.
// This way the projection never silently skips an event.

export const projectUsers = async (event: Event): Promise<void> => {
    getLogger().debug({
        category: 'ProjectUsers',
        message: `Projecting event ${event.type} to users.`,
    });

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

        // The observer delivers events at least once. So the same event
        // can arrive a second time, for example after a crash.
        // insertOnce() only inserts the user if it does not exist yet
        // which makes it safe to apply this event again.
        await userRepository.insertOnce(user);

        return;
    }

    if (isUserInvitationAcceptedEvent(event)) {
        await userRepository.updateOne({
            filter: { id: event.subject.split('/')[2] },
            update: {
                $set: {
                    revision: event.id,
                    acceptedAt: new Date(event.data.acceptedAt),
                },
            },
        });
    }
};

// This is the event consumer we register on the event observer.
//
// The name is the key of the checkpoint the observer stores for this
// consumer. The checkpoint is the id of the last event the consumer
// finished and it is used to resume after a restart of the application.
// The name has to stay stable. If we rename the consumer it starts
// without a checkpoint and replays all events from the beginning.
//
// With handles() we tell the observer which events we want to get.
// All other events are skipped but still advance the checkpoint.

export const usersProjection: EventConsumer = {
    name: 'iam.users',
    handles: (event) => {
        return (
            isUserInvitedEvent(event) || isUserInvitationAcceptedEvent(event)
        );
    },
    handle: projectUsers,
};

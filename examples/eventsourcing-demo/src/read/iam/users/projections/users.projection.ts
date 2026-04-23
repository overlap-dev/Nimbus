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

export const projectUsers = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
) => {
    getLogger().info({
        category: 'ProjectUsers',
        message: `Projecting event ${eventSourcingDBEvent.type} to users.`,
    });

    const event = eventSourcingDBEventToNimbusEvent<
        UserInvitedEvent | UserInvitationAcceptedEvent
    >(
        eventSourcingDBEvent,
    );

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

    getLogger().warn({
        category: 'ProjectViews',
        message: `Unknown event type ${(event as { type: string }).type}`,
    });
};

export const getUserProjectionLowerBound = async () => {
    const lastEventId = await userRepository.getLastProjectedEventId();

    return {
        id: lastEventId,
        type: lastEventId === '0' ? 'inclusive' : 'exclusive',
    };
};

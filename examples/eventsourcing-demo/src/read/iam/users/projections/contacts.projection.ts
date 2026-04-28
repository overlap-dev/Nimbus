import { getLogger } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { ObjectId } from 'mongodb';
import {
    isUserInvitedEvent,
    UserInvitedEvent,
} from '../../../../write/iam/users/core/events/userInvited.event.ts';
import { Contact } from './contacts.collection.ts';
import { contactRepository } from './contacts.repository.ts';

// Here we define the "contacts" projection.
// Just a second projection for demo purposes to demonstrate how
// The same events can be used to build different projections.

export const projectContacts = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
) => {
    getLogger().debug({
        category: 'ProjectContacts',
        message: `Projecting event ${eventSourcingDBEvent.type} to contacts.`,
    });

    const event = eventSourcingDBEventToNimbusEvent<
        UserInvitedEvent
    >(
        eventSourcingDBEvent,
    );

    if (isUserInvitedEvent(event)) {
        const contact: Contact = {
            _id: new ObjectId().toString(),
            id: event.data.id,
            revision: event.id,
            email: event.data.email,
            firstName: event.data.firstName,
            lastName: event.data.lastName,
        };

        try {
            await contactRepository.insertOne({ item: contact });

            return;
        } catch (error) {
            getLogger().error({
                category: 'ProjectContacts',
                message:
                    `Could not project event ${event.type} to contacts view.`,
                error: error as Error,
            });

            return;
        }
    }

    getLogger().warn({
        category: 'ProjectContacts',
        message: `Unknown event type ${(event as { type: string }).type}`,
    });
};

export const getContactProjectionLowerBound = async () => {
    const lastEventId = await contactRepository.getLastProjectedEventId();

    return {
        id: lastEventId,
        type: lastEventId === '0' ? 'inclusive' : 'exclusive',
    };
};

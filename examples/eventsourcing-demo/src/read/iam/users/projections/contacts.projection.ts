import { type Event, getLogger } from '@nimbus-cqrs/core';
import type { EventConsumer } from '@nimbus-cqrs/eventsourcingdb';
import { ObjectId } from 'mongodb';
import { isUserInvitedEvent } from '../../../../write/iam/users/core/events/userInvited.event.ts';
import type { Contact } from './contacts.collection.ts';
import { contactRepository } from './contacts.repository.ts';

// Here we define the "contacts" projection.
// Just a second projection for demo purposes to demonstrate how
// The same events can be used to build different projections.
//
// It is a second consumer on the same event observer as the
// "users" projection and it owns its own checkpoint.

export const projectContacts = async (event: Event): Promise<void> => {
    getLogger().debug({
        category: 'ProjectContacts',
        message: `Projecting event ${event.type} to contacts.`,
    });

    if (isUserInvitedEvent(event)) {
        const contact: Contact = {
            _id: new ObjectId().toString(),
            id: event.data.id,
            revision: event.id,
            email: event.data.email,
            firstName: event.data.firstName,
            lastName: event.data.lastName,
        };

        await contactRepository.insertOnce(contact);
    }
};

export const contactsProjection: EventConsumer = {
    name: 'iam.contacts',
    handles: (event) => {
        return isUserInvitedEvent(event);
    },
    handle: projectContacts,
};

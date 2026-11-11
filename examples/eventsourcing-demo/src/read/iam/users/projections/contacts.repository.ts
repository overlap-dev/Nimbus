import { getEnv } from '@nimbus-cqrs/core';
import {
    getMongoConnectionManager,
    MongoDBRepository,
    updateOne,
} from '@nimbus-cqrs/mongodb';
import { type Document, ObjectId } from 'mongodb';
import { CONTACTS_COLLECTION, Contact } from './contacts.collection.ts';

class ContactRepository extends MongoDBRepository<Contact> {
    constructor() {
        const env = getEnv({ variables: ['MONGO_DB'] });

        super(
            () => {
                return getMongoConnectionManager().getCollection(
                    env.MONGO_DB,
                    CONTACTS_COLLECTION.name,
                );
            },
            Contact,
            'Contact',
        );
    }

    override _mapDocumentToEntity(doc: Document): Contact {
        return Contact.parse({
            _id: doc._id.toString(),
            id: doc.id,
            revision: doc.revision,
            email: doc.email,
            firstName: doc.firstName,
            lastName: doc.lastName,
        });
    }

    override _mapEntityToDocument(contact: Contact): Document {
        return {
            _id: new ObjectId(contact._id),
            id: contact.id,
            revision: contact.revision,
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
        };
    }

    // Inserts the contact only if there is no contact with the same id yet.
    // See insertOnce() in users.repository.ts for the details.
    public async insertOnce(contact: Contact): Promise<void> {
        const collection = await this._getCollection();

        await updateOne({
            collection,
            filter: { id: contact.id },
            update: { $setOnInsert: this._mapEntityToDocument(contact) },
            options: { upsert: true },
        });
    }
}

export const contactRepository = new ContactRepository();

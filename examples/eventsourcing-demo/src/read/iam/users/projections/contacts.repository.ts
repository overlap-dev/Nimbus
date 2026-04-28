import {
    getMongoConnectionManager,
    MongoDBRepository,
} from '@nimbus-cqrs/mongodb';
import { getEnv } from '@nimbus-cqrs/utils';
import { Document, ObjectId } from 'mongodb';
import { Contact, CONTACTS_COLLECTION } from './contacts.collection.ts';

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

    public async getLastProjectedEventId(): Promise<string> {
        const contacts = await this.find({
            filter: {},
            limit: 1,
            skip: 0,
            sort: { revision: -1 },
        });

        return contacts[0]?.revision ?? '0';
    }
}

export const contactRepository = new ContactRepository();

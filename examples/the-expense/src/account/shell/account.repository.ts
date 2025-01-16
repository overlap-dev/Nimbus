import { MongoDBRepository } from '@nimbus/mongodb';
import { getEnv } from '@nimbus/utils';
import { Document, ObjectId } from 'mongodb';
import { mongoClient } from '../../mongoClient.ts';
import { Account } from '../core/account.type.ts';
import { ACCOUNT_COLLECTION } from './account.collection.ts';

class AccountRepository extends MongoDBRepository<Account> {
    constructor() {
        const env = getEnv({ variables: ['MONGO_DB'] });

        super(
            mongoClient.db(env.MONGO_DB).collection(ACCOUNT_COLLECTION.name),
            Account,
            'Account',
        );
    }

    override _mapDocumentToEntity(doc: Document): Account {
        return Account.parse({
            _id: doc._id.toString(),
            name: doc.name,
            status: doc.status,
        });
    }

    override _mapEntityToDocument(client: Account): Document {
        return {
            _id: new ObjectId(client._id),
            name: client.name,
            status: client.status,
        };
    }
}

export const accountRepository = new AccountRepository();

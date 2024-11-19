import type { Repository } from '@nimbus/core';
import type { Collection, Document } from 'mongodb';

export interface MongoDBRepository<TEntity> extends Repository<TEntity> {
    _collection: Collection<Document>;
}

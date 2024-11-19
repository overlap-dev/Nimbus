import type * as E from '@baetheus/fun/either';
import type { Exception } from '../exception/exception.ts';

export type RepositoryReadOptions = {
    limit?: number;
    skip?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    filterString?: string;
};

export interface Repository<TEntity> {
    create: (input: TEntity) => Promise<E.Either<Exception, TEntity>>;
    read: (
        input: RepositoryReadOptions,
    ) => Promise<E.Either<Exception, TEntity[]>>;
    readById: (id: string) => Promise<E.Either<Exception, TEntity>>;
    update: (input: TEntity) => Promise<E.Either<Exception, TEntity>>;
    delete: (input: TEntity) => Promise<E.Either<Exception, TEntity>>;
    count: () => Promise<E.Either<Exception, number>>;
}

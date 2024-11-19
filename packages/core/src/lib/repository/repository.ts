export type RepositoryReadOptions = {
    limit?: number;
    skip?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    filterString?: string;
};

export interface Repository<TEntity extends Record<string, any>> {
    create: (input: TEntity) => Promise<TEntity>;
    read: (input: RepositoryReadOptions) => Promise<TEntity[]>;
    readById: (id: string) => Promise<TEntity>;
    update: (input: TEntity) => Promise<TEntity>;
    delete: (input: TEntity) => Promise<TEntity>;
}

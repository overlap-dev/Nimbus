export type WithPagination<TItems> = {
    limit: number;
    skip: number;
    total: number;
    items: TItems[];
};

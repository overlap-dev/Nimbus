import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

export const Query = <
    TName extends ZodType,
    TParams extends ZodType,
    TMetadata extends ZodType,
>(
    nameType: TName,
    paramsType: TParams,
    metadataType: TMetadata,
) => {
    return z.object({
        name: nameType,
        metadata: metadataType,
        params: paramsType,
    });
};

type QueryType<
    TName extends ZodType,
    TParams extends ZodType,
    TMetadata extends ZodType,
> = ReturnType<typeof Query<TName, TParams, TMetadata>>;

export type Query<TName, TParams, TMetadata> = z.infer<
    QueryType<ZodType<TName>, ZodType<TParams>, ZodType<TMetadata>>
>;

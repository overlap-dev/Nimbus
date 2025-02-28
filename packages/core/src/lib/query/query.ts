import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

/**
 * Zod schema for the Query.
 */
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

/**
 * The type of the Query.
 */
type QueryType<
    TName extends ZodType,
    TParams extends ZodType,
    TMetadata extends ZodType,
> = ReturnType<typeof Query<TName, TParams, TMetadata>>;

/**
 * The type of the Query.
 */
export type Query<TName, TParams, TMetadata> = z.infer<
    QueryType<ZodType<TName>, ZodType<TParams>, ZodType<TMetadata>>
>;

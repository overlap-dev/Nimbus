import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

/**
 * Zod schema for the QueryMetadata.
 */
export const QueryMetadata = <TAuthContext extends ZodType>(
    authContextType: TAuthContext,
) => {
    return z.object({
        correlationId: z.string(),
        authContext: authContextType.optional(),
    });
};

/**
 * The type of the QueryMetadata.
 */
type QueryMetadataType<TAuthContext extends ZodType> = ReturnType<
    typeof QueryMetadata<TAuthContext>
>;

/**
 * The type of the QueryMetadata.
 */
export type QueryMetadata<TAuthContext> = z.infer<
    QueryMetadataType<ZodType<TAuthContext>>
>;

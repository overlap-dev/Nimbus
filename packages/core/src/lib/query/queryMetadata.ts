import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

export const QueryMetadata = <TAuthContext extends ZodType>(
    authContextType?: TAuthContext,
) => {
    return z.object({
        correlationId: z.string(),
        authContext: (authContextType ?? z.record(z.string(), z.string()))
            .optional(),
    });
};

type QueryMetadataType<TAuthContext extends ZodType> = ReturnType<
    typeof QueryMetadata<TAuthContext>
>;

export type QueryMetadata<TAuthContext> = z.infer<
    QueryMetadataType<ZodType<TAuthContext>>
>;

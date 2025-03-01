import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

/**
 * Zod schema for the CommandMetadata.
 */
export const CommandMetadata = <TAuthContext extends ZodType>(
    authContextType: TAuthContext,
) => {
    return z.object({
        correlationId: z.string(),
        authContext: authContextType.optional(),
    });
};

/**
 * The type of the CommandMetadata.
 */
type CommandMetadataType<TAuthContext extends ZodType> = ReturnType<
    typeof CommandMetadata<TAuthContext>
>;

/**
 * The type of the CommandMetadata.
 */
export type CommandMetadata<TAuthContext> = z.infer<
    CommandMetadataType<ZodType<TAuthContext>>
>;

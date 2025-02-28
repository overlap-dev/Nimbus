import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

/**
 * Zod schema for the EventMetadata.
 */
export const EventMetadata = <TAuthContext extends ZodType>(
    authContextType: TAuthContext,
) => {
    return z.object({
        correlationId: z.string(),
        authContext: authContextType.optional(),
    });
};

/**
 * The type of the EventMetadata.
 */
type EventMetadataType<TAuthContext extends ZodType> = ReturnType<
    typeof EventMetadata<TAuthContext>
>;

/**
 * The type of the EventMetadata.
 */
export type EventMetadata<TAuthContext> = z.infer<
    EventMetadataType<ZodType<TAuthContext>>
>;

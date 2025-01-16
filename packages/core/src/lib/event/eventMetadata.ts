import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

export const EventMetadata = <TAuthContext extends ZodType>(
    authContextType?: TAuthContext,
) => {
    return z.object({
        correlationId: z.string(),
        authContext: (authContextType ?? z.record(z.string(), z.string()))
            .optional(),
    });
};

type EventMetadataType<TAuthContext extends ZodType> = ReturnType<
    typeof EventMetadata<TAuthContext>
>;

export type EventMetadata<TAuthContext> = z.infer<
    EventMetadataType<ZodType<TAuthContext>>
>;

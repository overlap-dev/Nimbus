import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

export const CommandMetadata = <TAuthContext extends ZodType>(
    authContextType: TAuthContext,
) => {
    return z.object({
        correlationId: z.string(),
        authContext: authContextType.optional(),
    });
};

type CommandMetadataType<TAuthContext extends ZodType> = ReturnType<
    typeof CommandMetadata<TAuthContext>
>;

export type CommandMetadata<TAuthContext> = z.infer<
    CommandMetadataType<ZodType<TAuthContext>>
>;

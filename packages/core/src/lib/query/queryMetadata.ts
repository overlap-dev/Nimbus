import { z, type ZodType } from 'zod';
import { AuthContext } from '../authContext.ts';

// TODO: fix slow type issue

export const QueryMetadata = <TAuthPolicy extends ZodType>(
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        domain: z.string(),
        version: z.number(),
        correlationId: z.string(),
        authContext: AuthContext(authPolicyType).optional(),
    });
};

type QueryMetadataType<TAuthPolicy extends ZodType> = ReturnType<
    typeof QueryMetadata<TAuthPolicy>
>;

export type QueryMetadata<TAuthPolicy> = z.infer<
    QueryMetadataType<ZodType<TAuthPolicy>>
>;

import { ZodType, z } from 'zod';
import { AuthContext } from '../authContext';

export const CommandMetadata = <TAuthPolicy extends ZodType>(
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        domain: z.string(),
        version: z.number(),
        correlationId: z.string(),
        authContext: AuthContext(authPolicyType).optional(),
    });
};

type CommandMetadataType<TAuthPolicy extends ZodType> = ReturnType<
    typeof CommandMetadata<TAuthPolicy>
>;

export type CommandMetadata<TAuthPolicy> = z.infer<
    CommandMetadataType<ZodType<TAuthPolicy>>
>;

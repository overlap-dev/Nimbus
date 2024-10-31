import { z, type ZodType } from 'zod';
import { AuthContext } from '../authContext.ts';

export const EventMetadata = <TAuthPolicy extends ZodType>(
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        domain: z.string(),
        producer: z.string(),
        version: z.number(),
        correlationId: z.string(),
        authContext: AuthContext(authPolicyType).optional(),
    });
};

type EventMetadataType<TAuthPolicy extends ZodType> = ReturnType<
    typeof EventMetadata<TAuthPolicy>
>;

export type EventMetadata<TAuthPolicy> = z.infer<
    EventMetadataType<ZodType<TAuthPolicy>>
>;

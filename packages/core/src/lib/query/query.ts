import { ZodType, z } from 'zod';
import { AuthContext } from '../authContext';

export const Query = <
    TType extends ZodType,
    TParams extends ZodType,
    TAuthPolicy extends ZodType,
>(
    typeType: TType,
    paramsType: TParams,
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        type: typeType,
        correlationId: z.string(),
        authContext: AuthContext(authPolicyType).optional(),
        params: paramsType.optional(),
    });
};

type QueryType<
    TType extends ZodType,
    TParams extends ZodType,
    TAuthPolicy extends ZodType,
> = ReturnType<typeof Query<TType, TParams, TAuthPolicy>>;

export type Query<TType, TParams, TAuthPolicy> = z.infer<
    QueryType<ZodType<TType>, ZodType<TParams>, ZodType<TAuthPolicy>>
>;

export const AnyQuery = Query(z.string(), z.unknown(), z.unknown());

export type AnyQuery = z.infer<typeof AnyQuery>;

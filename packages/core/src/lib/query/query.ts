import { ZodType, z } from 'zod';
import { QueryMetadata } from './queryMetadata';

export const Query = <
    TName extends ZodType,
    TParams extends ZodType,
    TAuthPolicy extends ZodType,
>(
    nameType: TName,
    paramsType: TParams,
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        name: nameType,
        metadata: QueryMetadata(authPolicyType),
        params: paramsType.optional(),
    });
};

type QueryType<
    TName extends ZodType,
    TParams extends ZodType,
    TAuthPolicy extends ZodType,
> = ReturnType<typeof Query<TName, TParams, TAuthPolicy>>;

export type Query<TName, TParams, TAuthPolicy> = z.infer<
    QueryType<ZodType<TName>, ZodType<TParams>, ZodType<TAuthPolicy>>
>;

export const AnyQuery = Query(z.string(), z.unknown(), z.unknown());

export type AnyQuery = z.infer<typeof AnyQuery>;

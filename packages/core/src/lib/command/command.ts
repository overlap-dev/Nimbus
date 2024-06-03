import { ZodType, z } from 'zod';
import { AuthContext } from '../authContext';

export const Command = <
    TType extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
>(
    typeType: TType,
    dataType: TData,
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        type: typeType,
        correlationId: z.string(),
        authContext: AuthContext(authPolicyType).optional(),
        data: dataType,
    });
};

type CommandType<
    TType extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
> = ReturnType<typeof Command<TType, TData, TAuthPolicy>>;

export type Command<TType, TData, TAuthPolicy> = z.infer<
    CommandType<ZodType<TType>, ZodType<TData>, ZodType<TAuthPolicy>>
>;

export const AnyCommand = Command(z.string(), z.unknown(), z.unknown());

export type AnyCommand = z.infer<typeof AnyCommand>;

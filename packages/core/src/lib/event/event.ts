import { ZodType, z } from 'zod';
import { AuthContext } from '../authContext';

export const Event = <
    TSource extends ZodType,
    TType extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
>(
    sourceType: TSource,
    typeType: TType,
    dataType: TData,
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        source: sourceType,
        type: typeType,
        correlationId: z.string(),
        authContext: AuthContext(authPolicyType).optional(),
        data: dataType,
    });
};

type EventType<
    TSource extends ZodType,
    TType extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
> = ReturnType<typeof Event<TSource, TType, TData, TAuthPolicy>>;

export type Event<TSource, TType, TData, TAuthPolicy> = z.infer<
    EventType<
        ZodType<TSource>,
        ZodType<TType>,
        ZodType<TData>,
        ZodType<TAuthPolicy>
    >
>;

export const AnyEvent = Event(z.string(), z.string(), z.unknown(), z.unknown());

export type AnyEvent = z.infer<typeof AnyEvent>;

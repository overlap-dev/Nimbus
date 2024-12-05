import { z, type ZodType } from 'zod';
import { EventMetadata } from './eventMetadata.ts';

// TODO: fix slow type issue

export const Event = <
    TName extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
>(
    nameType: TName,
    dataType: TData,
    authPolicyType: TAuthPolicy,
) => {
    return z.object({
        name: nameType,
        metadata: EventMetadata(authPolicyType),
        data: dataType,
    });
};

type EventType<
    TName extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
> = ReturnType<typeof Event<TName, TData, TAuthPolicy>>;

export type Event<TName, TData, TAuthPolicy> = z.infer<
    EventType<ZodType<TName>, ZodType<TData>, ZodType<TAuthPolicy>>
>;

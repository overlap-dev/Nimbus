import { z, type ZodType } from 'zod';
import { CommandMetadata } from './commandMetadata.ts';

// TODO: fix slow type issue

export const Command = <
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
        metadata: CommandMetadata(authPolicyType),
        data: dataType,
    });
};

type CommandType<
    TName extends ZodType,
    TData extends ZodType,
    TAuthPolicy extends ZodType,
> = ReturnType<typeof Command<TName, TData, TAuthPolicy>>;

export type Command<TName, TData, TAuthPolicy> = z.infer<
    CommandType<ZodType<TName>, ZodType<TData>, ZodType<TAuthPolicy>>
>;

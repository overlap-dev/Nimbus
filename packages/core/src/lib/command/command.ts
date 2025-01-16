import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

export const Command = <
    TName extends ZodType,
    TData extends ZodType,
    TMetadata extends ZodType,
>(
    nameType: TName,
    dataType: TData,
    metadataType: TMetadata,
) => {
    return z.object({
        name: nameType,
        metadata: metadataType,
        data: dataType,
    });
};

type CommandType<
    TName extends ZodType,
    TData extends ZodType,
    TMetadata extends ZodType,
> = ReturnType<typeof Command<TName, TData, TMetadata>>;

export type Command<TName, TData, TMetadata> = z.infer<
    CommandType<ZodType<TName>, ZodType<TData>, ZodType<TMetadata>>
>;

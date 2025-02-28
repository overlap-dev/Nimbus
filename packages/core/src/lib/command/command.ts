import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

/**
 * Zod schema for the Command.
 */
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

/**
 * The type of the Command.
 */
type CommandType<
    TName extends ZodType,
    TData extends ZodType,
    TMetadata extends ZodType,
> = ReturnType<typeof Command<TName, TData, TMetadata>>;

/**
 * The type of the Command.
 */
export type Command<TName, TData, TMetadata> = z.infer<
    CommandType<ZodType<TName>, ZodType<TData>, ZodType<TMetadata>>
>;

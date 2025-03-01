import { z, type ZodType } from 'zod';

// TODO: fix slow type issue

/**
 * Zod schema for the Event.
 */
export const Event = <
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
 * The type of the Event.
 */
type EventType<
    TName extends ZodType,
    TData extends ZodType,
    TMetadata extends ZodType,
> = ReturnType<typeof Event<TName, TData, TMetadata>>;

/**
 * The type of the Event.
 */
export type Event<TName, TData, TMetadata> = z.infer<
    EventType<ZodType<TName>, ZodType<TData>, ZodType<TMetadata>>
>;

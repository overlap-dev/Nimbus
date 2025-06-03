import { z, type ZodType } from 'zod';
import { CloudEvent } from '../cloudEvent/cloudEvent.ts';
import { MessageEnvelope } from '../messageEnvelope.ts';

// TODO: fix slow type issue

/**
 * Zod schema for the Event object.
 */
export const Event = <
    TType extends ZodType,
    TData extends ZodType,
>(
    typeType: TType,
    dataType: TData,
) => {
    return CloudEvent(
        typeType,
        MessageEnvelope(dataType, z.never()),
    );
};

/**
 * Inference type to create the Event type.
 */
type EventType<
    TType extends ZodType,
    TData extends ZodType,
> = ReturnType<typeof Event<TType, TData>>;

/**
 * The type of the Event object.
 */
export type Event<TType, TData> = z.infer<
    EventType<ZodType<TType>, ZodType<TData>>
>;

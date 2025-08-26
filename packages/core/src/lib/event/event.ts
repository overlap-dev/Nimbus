import { ulid } from '@std/ulid';
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
    ).extend({
        subject: z.string().min(1),
    });
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

/**
 * Input type for the createEvent function.
 */
export type CreateEventInput = {
    source: string;
    type: string;
    subject: string;
    data: any;
    datacontenttype?: string;
    dataschema?: string;
};

/**
 * Create a new event.
 */
export const createEvent = <TEvent extends CloudEvent<string, any>>({
    source,
    type,
    subject,
    data,
    datacontenttype,
    dataschema,
}: CreateEventInput): TEvent => {
    return {
        specversion: '1.0',
        id: ulid(),
        source: source,
        type: type,
        data: data,
        subject: subject,
        time: new Date().toISOString(),
        ...(datacontenttype && { datacontenttype }),
        ...(dataschema && { dataschema }),
    } as TEvent;
};

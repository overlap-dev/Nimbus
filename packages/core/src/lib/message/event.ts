import { ulid } from '@std/ulid';
import { z } from 'zod';

/**
 * An event is a message that is emitted by the system to notify
 * subscribers that something has happened. Typically events are
 * the result of a command that was executed before.
 *
 * Nimbus sticks to the CloudEvents specifications for all messages
 * to make it easier to work with these messages across multiple systems.
 *
 * @see https://cloudevents.io/ for more information.
 *
 * @property {string} specversion - The version of the CloudEvents specification which the event uses.
 * @property {string} id - A globally unique identifier of the event.
 * @property {string} correlationid - A globally unique identifier that indicates a correlation to previous and subsequent messages to this event.
 * @property {string} time - The time when the event was created.
 * @property {string} source - A URI reference that identifies the system that is constructing the event.
 * @property {string} type - The type must follow the CloudEvents naming convention, which uses a reversed domain name as a namespace, followed by a domain-specific name.
 * @property {string} subject - An identifier for an object or entity the event is about (optional).
 * @property {TData} data - The actual data, containing the specific business payload.
 * @property {string} datacontenttype - A MIME type that indicates the format that the data is in (optional).
 * @property {string} dataschema - An absolute URL to the schema that the data adheres to (optional).
 *
 * @template TData - The type of the data.
 *
 * @example
 * const orderSubmittedEvent: Event<Order> = {
 *     specversion: '1.0',
 *     id: '123',
 *     correlationid: '456',
 *     time: '2025-01-01T00:00:00Z',
 *     source: 'https://nimbus.overlap.at',
 *     type: 'at.overlap.nimbus.submit-order',
 *     subject: '/orders/42',
 *     data: {
 *         orderId: '42',
 *         customerId: '666',
 *         cartId: '123',
 *         status: 'submitted',
 *     },
 *     datacontenttype: 'application/json',
 * };
 */
export type Event<TData = unknown> = {
    specversion: '1.0';
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    subject: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};

/**
 * Type alias for the event data field schema.
 */
type EventDataSchema = z.ZodUnion<
    [
        z.ZodRecord<z.ZodString, z.ZodUnknown>,
        z.ZodString,
        z.ZodNumber,
        z.ZodArray<z.ZodUnknown>,
        z.ZodBoolean,
    ]
>;

/**
 * Type alias for the event schema shape.
 */
export type EventSchemaType = z.ZodObject<{
    specversion: z.ZodLiteral<'1.0'>;
    id: z.ZodString;
    correlationid: z.ZodString;
    time: z.ZodISODateTime;
    source: z.ZodString;
    type: z.ZodString;
    subject: z.ZodString;
    data: EventDataSchema;
    datacontenttype: z.ZodOptional<z.ZodString>;
    dataschema: z.ZodOptional<z.ZodURL>;
}>;

/**
 * The Zod schema matching the Event type.
 *
 * Zod is the default for validating incomming messages.
 *
 * We do not infer the Event type from this schema because of
 * slow type issues see https://jsr.io/docs/about-slow-types for more details.
 */
export const eventSchema: EventSchemaType = z.object({
    specversion: z.literal('1.0'),
    id: z.string(),
    correlationid: z.string(),
    time: z.iso.datetime(),
    source: z.string(),
    type: z.string(),
    subject: z.string(),
    data: z.union([
        z.record(z.string(), z.unknown()),
        z.string(),
        z.number(),
        z.array(z.unknown()),
        z.boolean(),
    ]),
    datacontenttype: z.string().optional(),
    dataschema: z.url().optional(),
});

/**
 * Input for creating an event.
 */
export type CreateEventInput = Partial<Omit<Event, 'specversion'>> & {
    type: string;
    source: string;
    subject: string;
    data: unknown;
};

/**
 * Creates an event based on input data with the convenience
 * to skip properties and use the defaults for the rest.
 */
export const createEvent = <TEvent extends Event>(
    {
        id,
        correlationid,
        time,
        source,
        type,
        subject,
        data,
        datacontenttype,
        dataschema,
    }: CreateEventInput,
): TEvent => {
    const event = {
        specversion: '1.0',
        id: id ?? ulid(),
        correlationid: correlationid ?? ulid(),
        time: time ?? new Date().toISOString(),
        source,
        type,
        subject,
        data,
        datacontenttype: datacontenttype ?? 'application/json',
        ...(dataschema && { dataschema }),
    } as TEvent;

    return event;
};

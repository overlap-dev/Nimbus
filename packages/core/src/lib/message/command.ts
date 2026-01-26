import { ulid } from '@std/ulid';
import { z } from 'zod';

/**
 * A command is a message that is sent to tell the system
 * to perform an action. Typically commands come in via an API
 * like HTTP POST requests, gRPC calls, or similar inbound traffic.
 *
 * Nimbus sticks to the CloudEvents specifications for all messages
 * to make it easier to work with these messages across multiple systems.
 *
 * @see https://cloudevents.io/ for more information.
 *
 * @property {string} specversion - The version of the CloudEvents specification which the event uses.
 * @property {string} id - A globally unique identifier of the event.
 * @property {string} correlationid - A globally unique identifier that indicates a correlation to previous and subsequent messages.
 * @property {string} time - The time when the command was created.
 * @property {string} source - A URI reference that identifies the system that is constructing the command.
 * @property {string} type - The type must follow the CloudEvents naming convention, which uses a reversed domain name as a namespace, followed by a domain-specific name.
 * @property {string} subject - An identifier for an object or entity the command is about (optional).
 * @property {TData} data - The actual data, containing the specific business payload.
 * @property {string} datacontenttype - A MIME type that indicates the format that the data is in (optional).
 * @property {string} dataschema - An absolute URL to the schema that the data adheres to (optional).
 *
 * @template TData - The type of the data.
 *
 * @example
 * const submitOrderCommand: Command<SubmitOrderPayload> = {
 *     specversion: '1.0',
 *     id: '123',
 *     correlationid: '456',
 *     time: '2025-01-01T00:00:00Z',
 *     source: 'https://nimbus.overlap.at',
 *     type: 'at.overlap.nimbus.submit-order',
 *     data: {
 *         customerId: '666',
 *         cartId: '123',
 *     },
 *     datacontenttype: 'application/json',
 * };
 */
export type Command<TData = unknown> = {
    specversion: '1.0';
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    subject?: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};

/**
 * Type alias for the command data field schema.
 */
type CommandDataSchema = z.ZodUnion<
    [
        z.ZodRecord<z.ZodString, z.ZodUnknown>,
        z.ZodString,
        z.ZodNumber,
        z.ZodArray<z.ZodUnknown>,
        z.ZodBoolean,
    ]
>;

/**
 * Type alias for the command schema shape.
 */
export type CommandSchemaType = z.ZodObject<{
    specversion: z.ZodLiteral<'1.0'>;
    id: z.ZodString;
    correlationid: z.ZodString;
    time: z.ZodISODateTime;
    source: z.ZodString;
    type: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    data: CommandDataSchema;
    datacontenttype: z.ZodOptional<z.ZodString>;
    dataschema: z.ZodOptional<z.ZodURL>;
}>;

/**
 * The Zod schema matching the Command type.
 *
 * Zod is the default for validating incomming messages.
 *
 * We do not infer the Command type from this schema because of
 * slow type issues see https://jsr.io/docs/about-slow-types for more details.
 */
export const commandSchema: CommandSchemaType = z.object({
    specversion: z.literal('1.0'),
    id: z.string(),
    correlationid: z.string(),
    time: z.iso.datetime(),
    source: z.string(),
    type: z.string(),
    subject: z.string().optional(),
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
 * Input for creating a command.
 */
export type CreateCommandInput = Partial<Omit<Command, 'specversion'>> & {
    type: string;
    source: string;
    data: unknown;
};

/**
 * Creates a command based on input data with the convenience
 * to skip properties and use the defaults for the rest.
 */
export const createCommand = <TCommand extends Command>(
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
    }: CreateCommandInput,
): TCommand => {
    const command = {
        specversion: '1.0',
        id: id ?? ulid(),
        correlationid: correlationid ?? ulid(),
        time: time ?? new Date().toISOString(),
        source,
        type,
        ...(subject && { subject }),
        data,
        datacontenttype: datacontenttype ?? 'application/json',
        ...(dataschema && { dataschema }),
    } as TCommand;

    return command;
};

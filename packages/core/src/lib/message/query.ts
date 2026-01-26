import { ulid } from '@std/ulid';
import { z } from 'zod';

/**
 * A query is a message that is sent to the system to request
 * information.
 *
 * Nimbus sticks to the CloudEvents specifications for all messages
 * to make it easier to work with these messages across multiple systems.
 *
 * @see https://cloudevents.io/ for more information.
 *
 * @property {string} specversion - The version of the CloudEvents specification which the query uses.
 * @property {string} id - A globally unique identifier of the query.
 * @property {string} correlationid - A globally unique identifier that indicates a correlation to previous and subsequent messages to this query.
 * @property {string} time - The time when the query was created.
 * @property {string} source - A URI reference that identifies the system that is constructing the query.
 * @property {string} type - The type must follow the CloudEvents naming convention, which uses a reversed domain name as a namespace, followed by a domain-specific name.
 * @property {TData} data - The actual data, containing the specific business payload.
 * @property {string} datacontenttype - A MIME type that indicates the format that the data is in (optional).
 * @property {string} dataschema - An absolute URL to the schema that the data adheres to (optional).
 *
 * @template TData - The type of the data.
 *
 * @example
 * const getOrdersQuery: Query<GetOrdersParams> = {
 *     specversion: '1.0',
 *     id: '123',
 *     time: '2025-01-01T00:00:00Z',
 *     source: 'https://nimbus.overlap.at',
 *     type: 'at.overlap.nimbus.get-orders',
 *     data: {
 *         customerId: '666',
 *         status: 'fulfilled',
 *     },
 *     datacontenttype: 'application/json',
 * };
 */
export type Query<TData = unknown> = {
    specversion: '1.0';
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};

/**
 * Type alias for the query data field schema.
 */
type QueryDataSchema = z.ZodUnion<
    [
        z.ZodRecord<z.ZodString, z.ZodUnknown>,
        z.ZodString,
        z.ZodNumber,
        z.ZodArray<z.ZodUnknown>,
        z.ZodBoolean,
    ]
>;

/**
 * Type alias for the query schema shape.
 */
export type QuerySchemaType = z.ZodObject<{
    specversion: z.ZodLiteral<'1.0'>;
    id: z.ZodString;
    correlationid: z.ZodString;
    time: z.ZodISODateTime;
    source: z.ZodString;
    type: z.ZodString;
    data: QueryDataSchema;
    datacontenttype: z.ZodOptional<z.ZodString>;
    dataschema: z.ZodOptional<z.ZodURL>;
}>;

/**
 * The Zod schema matching the Query type.
 *
 * Zod is the default for validating incomming messages.
 *
 * We do not infer the Query type from this schema because of
 * slow type issues see https://jsr.io/docs/about-slow-types for more details.
 */
export const querySchema: QuerySchemaType = z.object({
    specversion: z.literal('1.0'),
    id: z.string(),
    correlationid: z.string(),
    time: z.iso.datetime(),
    source: z.string(),
    type: z.string(),
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
 * Input for creating a query.
 */
export type CreateQueryInput = Partial<Omit<Query, 'specversion'>> & {
    type: string;
    source: string;
    data: unknown;
};

/**
 * Creates a query based on input data with the convenience
 * to skip properties and use the defaults for the rest.
 */
export const createQuery = <TQuery extends Query>(
    {
        id,
        correlationid,
        time,
        source,
        type,
        data,
        datacontenttype,
        dataschema,
    }: CreateQueryInput,
): TQuery => {
    const query = {
        specversion: '1.0',
        id: id ?? ulid(),
        correlationid: correlationid ?? ulid(),
        time: time ?? new Date().toISOString(),
        source,
        type,
        data,
        datacontenttype: datacontenttype ?? 'application/json',
        ...(dataschema && { dataschema }),
    } as TQuery;

    return query;
};

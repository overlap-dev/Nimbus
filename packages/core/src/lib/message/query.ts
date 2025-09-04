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
    time: string;
    source: string;
    type: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};

export const querySchema = {
    $id: 'https://nimbus.overlap.at/schemas/query/v1',
    type: 'object',
    required: [
        'specversion',
        'id',
        'time',
        'source',
        'type',
        'data',
    ],
    properties: {
        specversion: {
            const: '1.0',
        },
        id: {
            type: 'string',
            minLength: 1,
        },
        time: {
            type: 'string',
            format: 'date-time',
            minLength: 1,
        },
        source: {
            type: 'string',
            format: 'uri-reference',
            minLength: 1,
        },
        type: {
            type: 'string',
            minLength: 1,
        },
        data: {
            type: 'object',
            additionalProperties: true,
        },
        datacontenttype: {
            type: 'string',
            minLength: 1,
        },
        dataschema: {
            type: 'string',
            format: 'uri',
            minLength: 1,
        },
    },
};

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

export const eventSchema = {
    $id: 'https://nimbus.overlap.at/schemas/event/v1',
    type: 'object',
    required: [
        'specversion',
        'id',
        'correlationid',
        'time',
        'source',
        'type',
        'subject',
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
        correlationid: {
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
        subject: {
            type: 'string',
            minLength: 1,
        },
        data: {
            anyOf: [
                {
                    type: 'object',
                },
                {
                    type: 'string',
                },
                {
                    type: 'number',
                },
                {
                    type: 'array',
                },
                {
                    type: 'boolean',
                },
            ],
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

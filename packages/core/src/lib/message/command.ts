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

export const commandSchema = {
    $id: 'https://nimbus.overlap.at/schemas/command/v1',
    type: 'object',
    required: [
        'specversion',
        'id',
        'correlationid',
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

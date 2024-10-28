/**
 * The commandSchema is used to validate the incoming command request
 * body on Fastify.
 */
export const commandSchema = {
    body: {
        type: 'object',
        required: ['name', 'domain', 'version', 'correlationId', 'data'],
        properties: {
            name: { type: 'string' },
            domain: { type: 'string' },
            version: { type: 'number' },
            correlationId: { type: 'string' },
            data: { type: 'object' },
        },
    },
};

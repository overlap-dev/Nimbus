import { querySchema } from '@nimbus/core';
import type { SchemaObject } from 'ajv';

export const ListRecipesQuerySchemaUrl =
    'https://api.gustav.app/schemas/queries/list-recipes/v1' as const;

export const listRecipesQuerySchema: SchemaObject = {
    ...querySchema,
    $id: ListRecipesQuerySchemaUrl,
    properties: {
        ...querySchema.properties,
        data: {
            type: 'object',
            required: [],
            properties: {
                limit: {
                    type: 'number',
                    minimum: 1,
                    maximum: 100,
                },
                offset: {
                    type: 'number',
                    minimum: 0,
                },
            },
        },
        dataschema: {
            const: ListRecipesQuerySchemaUrl,
        },
    },
};

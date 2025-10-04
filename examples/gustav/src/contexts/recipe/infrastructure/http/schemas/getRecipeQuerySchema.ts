import { querySchema } from '@nimbus/core';
import type { SchemaObject } from 'ajv';

export const GetRecipeQuerySchemaUrl =
    'https://api.gustav.app/schemas/queries/get-recipe/v1' as const;

/**
 * JSON Schema for GetRecipeQuery
 *
 * This schema validates the data payload of the get-recipe query.
 * It will be registered with the validator and referenced via dataschema URL.
 */
export const getRecipeQuerySchema: SchemaObject = {
    ...querySchema,
    $id: GetRecipeQuerySchemaUrl,
    properties: {
        ...querySchema.properties,
        data: {
            type: 'object',
            required: ['slug'],
            properties: {
                slug: {
                    type: 'string',
                    pattern: '^[a-z0-9-]+$',
                    minLength: 1,
                    maxLength: 100,
                },
            },
        },
        dataschema: {
            const: GetRecipeQuerySchemaUrl,
        },
    },
};

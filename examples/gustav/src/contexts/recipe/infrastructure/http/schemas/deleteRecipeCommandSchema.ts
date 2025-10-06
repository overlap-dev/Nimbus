import { querySchema } from '@nimbus/core';
import type { SchemaObject } from 'ajv';

export const DeleteRecipeCommandSchemaUrl =
    'https://api.gustav.app/schemas/commands/delete-recipe/v1' as const;

export const deleteRecipeCommandSchema: SchemaObject = {
    ...querySchema,
    $id: DeleteRecipeCommandSchemaUrl,
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
            const: DeleteRecipeCommandSchemaUrl,
        },
    },
};

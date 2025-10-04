import { commandSchema } from '@nimbus/core';
import type { SchemaObject } from 'ajv';

export const AddRecipeCommandSchemaUrl =
    'https://api.gustav.app/schemas/commands/add-recipe/v1' as const;

/**
 * JSON Schema for AddRecipeCommand
 *
 * This schema validates the data payload of the add-recipe command.
 * It will be registered with the validator and referenced via dataschema URL.
 */
export const addRecipeCommandSchema: SchemaObject = {
    ...commandSchema,
    $id: AddRecipeCommandSchemaUrl,
    properties: {
        ...commandSchema.properties,
        data: {
            type: 'object',
            required: ['slug', 'name', 'ingredients', 'instructions', 'tags'],
            properties: {
                slug: {
                    type: 'string',
                    pattern: '^[a-z0-9-]+$',
                    minLength: 1,
                    maxLength: 100,
                },
                name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                },
                ingredients: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['name', 'amount', 'unit'],
                        properties: {
                            name: { type: 'string', minLength: 1 },
                            amount: { type: 'number', minimum: 1 },
                            unit: { type: 'string', minLength: 1 },
                            productId: { type: 'string', minLength: 1 },
                        },
                    },
                },
                instructions: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1,
                    },
                },
                tags: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1,
                    },
                },
            },
        },
        dataschema: {
            const: AddRecipeCommandSchemaUrl,
        },
    },
};

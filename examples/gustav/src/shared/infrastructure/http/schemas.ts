import { getValidator } from '@nimbus/core';
import { addRecipeCommandSchema } from '../../../contexts/recipe/infrastructure/http/schemas/addRecipeCommandSchema.ts';
import { getRecipeQuerySchema } from '../../../contexts/recipe/infrastructure/http/schemas/getRecipeQuerySchema.ts';

/**
 * Register all JSON schemas with the Nimbus validator.
 *
 * This should be called during application startup, before any routes are accessed.
 * The schemas are used to validate message payloads when dataschema is present.
 */
export function registerSchemas(): void {
    const validator = getValidator();

    validator.addSchema(addRecipeCommandSchema);
    validator.addSchema(getRecipeQuerySchema);

    // TODO: Add more schemas as you develop more commands/queries
}

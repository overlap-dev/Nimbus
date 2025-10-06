import { getValidator } from '@nimbus/core';
import { addRecipeCommandSchema } from '../../../contexts/recipe/infrastructure/http/schemas/addRecipeCommandSchema.ts';
import { deleteRecipeCommandSchema } from '../../../contexts/recipe/infrastructure/http/schemas/deleteRecipeCommandSchema.ts';
import { getRecipeQuerySchema } from '../../../contexts/recipe/infrastructure/http/schemas/getRecipeQuerySchema.ts';
import { listRecipesQuerySchema } from '../../../contexts/recipe/infrastructure/http/schemas/listRecipesQuerySchema.ts';
import { updateRecipeCommandSchema } from '../../../contexts/recipe/infrastructure/http/schemas/updateRecipeCommandSchema.ts';

/**
 * Register all JSON schemas with the Nimbus validator.
 *
 * This should be called during application startup, before any routes are accessed.
 * The schemas are used to validate message payloads when dataschema is present.
 */
export function registerSchemas(): void {
    const validator = getValidator();

    validator.addSchema(addRecipeCommandSchema);
    validator.addSchema(updateRecipeCommandSchema);
    validator.addSchema(deleteRecipeCommandSchema);
    validator.addSchema(getRecipeQuerySchema);
    validator.addSchema(listRecipesQuerySchema);

    // TODO: Add more schemas as you develop more commands/queries
}

import { AuthContext, Command, InvalidInputException } from '@nimbus/core';
import { ulid } from '@std/ulid';
import { z } from 'zod';
import { Unit } from '../../../../shared/types/unit.ts';
import type { Recipe } from '../domain/recipe.ts';
import { RecipeAddedEvent } from '../events/recipeAdded.ts';
import { RecipeEventOutputPort } from '../ports/recipeEventOutputPort.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const AddRecipeCommand = Command(
    z.literal('recipe.add'),
    z.object({
        name: z.string(),
        instructions: z.array(z.string()),
        ingredients: z.array(z.object({
            name: z.string(),
            quantity: z.number(),
            unit: Unit,
        })),
    }),
    AuthContext,
);
export type AddRecipeCommand = z.infer<typeof AddRecipeCommand>;

export const addRecipe = async (
    command: AddRecipeCommand,
    repository: RecipeRepository,
    eventBus: RecipeEventOutputPort,
): Promise<Recipe> => {
    const count = await repository.count({
        filter: {
            name: command.data.payload.name,
        },
    });

    if (count > 0) {
        throw new InvalidInputException('Recipe already exists', {
            errorCode: 'DUPLICATE_RECIPE',
            reason:
                'A recipe with this name already exists. The name for each recipe must be unique, please choose a different name.',
        });
    }

    const recipe = await repository.insert({
        id: repository.generateId(),
        name: command.data.payload.name,
        instructions: command.data.payload.instructions,
        ingredients: command.data.payload.ingredients,
    });

    eventBus.putEvent<RecipeAddedEvent>({
        specversion: '1.0',
        id: ulid(),
        source: command.source,
        type: 'recipe.added',
        data: {
            correlationId: command.data.correlationId,
            payload: {
                id: recipe.id,
                name: recipe.name,
            },
        },
    });

    return recipe;
};

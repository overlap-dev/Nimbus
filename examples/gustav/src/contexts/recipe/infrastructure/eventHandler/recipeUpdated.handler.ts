import { MessageHandler } from '@nimbus/core';
import { Recipe } from '../../core/domain/recipe.ts';
import {
    recipeUpdated,
    RecipeUpdatedEvent,
} from '../../core/events/recipeUpdated.ts';
import { recipeMemoryRepository } from '../repository/recipeMemoryRepository.ts';

export const recipeUpdatedHandler: MessageHandler<
    RecipeUpdatedEvent,
    Recipe
> = async (event) => {
    recipeUpdated(event);

    const recipe = await recipeMemoryRepository.update(
        event.data.slug,
        event.data.updates,
    );

    return recipe;
};

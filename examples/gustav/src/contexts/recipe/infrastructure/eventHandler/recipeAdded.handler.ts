import { MessageHandler } from '@nimbus/core';
import { Recipe } from '../../core/domain/recipe.ts';
import {
    recipeAdded,
    RecipeAddedEvent,
} from '../../core/events/recipeAdded.ts';
import { recipeMemoryRepository } from '../repository/recipeMemoryRepository.ts';

export const recipeAddedHandler: MessageHandler<
    RecipeAddedEvent,
    Recipe
> = async (event) => {
    recipeAdded(event);

    const recipe = await recipeMemoryRepository.insert(event.data);

    return recipe;
};

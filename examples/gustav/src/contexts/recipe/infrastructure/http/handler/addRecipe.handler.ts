import { MessageHandler } from '@nimbus/core';
import { eventStore } from '../../../../../shared/infrastructure/eventStore.ts';
import {
    addRecipe,
    AddRecipeCommand,
} from '../../../core/commands/addRecipe.ts';
import { Recipe } from '../../../core/domain/recipe.ts';

export const addRecipeHandler: MessageHandler<
    AddRecipeCommand,
    Recipe
> = async (command) => {
    const recipe = await addRecipe(
        command,
        eventStore,
    );

    return recipe;
};

import { MessageHandler } from '@nimbus/core';
import { eventStore } from '../../../../../shared/infrastructure/eventStore.ts';
import {
    updateRecipe,
    UpdateRecipeCommand,
} from '../../../core/commands/updateRecipe.ts';
import { Recipe } from '../../../core/domain/recipe.ts';

export const updateRecipeHandler: MessageHandler<
    UpdateRecipeCommand,
    Recipe
> = async (command) => {
    return updateRecipe(
        command,
        eventStore,
    );
};

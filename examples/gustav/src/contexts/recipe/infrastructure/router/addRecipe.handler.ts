import { MessageHandler } from '@nimbus/core';
import { eventSourcingDBEventStore } from '../../../../shared/adapters/eventSourcingDBEventStore.ts';
import { addRecipe, AddRecipeCommand } from '../../core/commands/addRecipe.ts';
import { Recipe } from '../../core/domain/recipe.ts';

export const addRecipeHandler: MessageHandler<
    AddRecipeCommand,
    Recipe
> = async (command) => {
    return await addRecipe(
        command,
        eventSourcingDBEventStore,
    );
};

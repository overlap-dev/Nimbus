import { MessageHandler } from '@nimbus/core';
import { eventStore } from '../../../../../shared/infrastructure/eventStore.ts';
import {
    deleteRecipe,
    DeleteRecipeCommand,
} from '../../../core/commands/deleteRecipe.ts';

export const deleteRecipeHandler: MessageHandler<
    DeleteRecipeCommand,
    void
> = async (command) => {
    await deleteRecipe(
        command,
        eventStore,
    );
};

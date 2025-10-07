import { MessageHandler } from '@nimbus/core';
import {
    recipeDeleted,
    RecipeDeletedEvent,
} from '../../core/events/recipeDeleted.ts';
import { recipeMemoryRepository } from '../repository/recipeMemoryRepository.ts';

export const recipeDeletedHandler: MessageHandler<
    RecipeDeletedEvent,
    void
> = async (event) => {
    recipeDeleted(event);

    await recipeMemoryRepository.delete(event.data.slug);
};

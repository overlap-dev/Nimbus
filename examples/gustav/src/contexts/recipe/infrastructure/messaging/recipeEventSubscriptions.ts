import { RouteHandlerMap } from '@nimbus/core';
import { RecipeAddedEvent } from '../../core/events/recipeAdded.ts';
import { recipeAddedHandler } from './recipeAdded.handler.ts';

export const recipeEventSubscriptions: RouteHandlerMap = {
    'recipe.added': {
        handler: recipeAddedHandler,
        inputType: RecipeAddedEvent,
    },
};

import { RouteHandler } from '@nimbus/core';
import {
    recipeAdded,
    RecipeAddedEvent,
} from '../../core/events/recipeAdded.ts';

export const recipeAddedHandler: RouteHandler<
    RecipeAddedEvent,
    RecipeAddedEvent
> = async (event) => {
    recipeAdded(event);

    return {
        statusCode: 200,
        data: event,
    };
};

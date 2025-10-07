import { Command, InvalidInputException } from '@nimbus/core';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import { Recipe } from '../domain/recipe.ts';
import { RecipeState, recipeSubject } from '../domain/recipeAggregate.ts';
import {
    RecipeAddedCommandType,
    RecipeAddedEvent,
} from '../events/recipeAdded.ts';

export const AddRecipeCommandType = 'at.overlap.nimbus.app-recipe' as const;

export type AddRecipeCommand = Command<Recipe> & {
    type: typeof AddRecipeCommandType;
};

export const addRecipe = (
    command: AddRecipeCommand,
    state: RecipeState,
): {
    newState: Recipe;
    events: RecipeAddedEvent[];
} => {
    const { EVENT_SOURCE } = getEnv({
        variables: ['EVENT_SOURCE'],
    });

    if (state !== null) {
        throw new InvalidInputException('Recipe already exists', {
            errorCode: 'DUPLICATE_RECIPE',
            reason:
                'A recipe with this slug already exists. The slug for each recipe must be unique, please choose a different slug.',
        });
    }

    const subject = recipeSubject(command.data.slug);

    const recipeAddedEvent: RecipeAddedEvent = {
        specversion: '1.0',
        id: ulid(),
        correlationid: command.correlationid,
        time: new Date().toISOString(),
        source: EVENT_SOURCE,
        type: RecipeAddedCommandType,
        subject,
        data: command.data,
        datacontenttype: 'application/json',
    };

    return {
        newState: command.data,
        events: [recipeAddedEvent],
    };
};

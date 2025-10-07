import { Command } from '@nimbus/core';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import { Recipe } from '../domain/recipe.ts';
import {
    RecipeState,
    recipeSubject,
    requireRecipe,
} from '../domain/recipeAggregate.ts';
import {
    RecipeUpdatedEvent,
    RecipeUpdatedEventType,
} from '../events/recipeUpdated.ts';

export const UpdateRecipeCommandType =
    'at.overlap.nimbus.update-recipe' as const;

export type UpdateRecipeData = Partial<Recipe> & {
    slug: string;
};

export type UpdateRecipeCommand =
    & Command<UpdateRecipeData>
    & {
        type: typeof UpdateRecipeCommandType;
    };

export const updateRecipe = (
    command: UpdateRecipeCommand,
    state: RecipeState,
): {
    newState: Recipe;
    events: RecipeUpdatedEvent[];
} => {
    const { EVENT_SOURCE } = getEnv({
        variables: ['EVENT_SOURCE'],
    });

    const subject = recipeSubject(command.data.slug);

    // Validate recipe exists
    const currentRecipe = requireRecipe(state);

    // Prevent slug changes
    const updates: Partial<Recipe> = {
        ...command.data,
    };
    if (updates.slug) {
        delete updates.slug;
    }

    // Create event
    const recipeUpdatedEvent: RecipeUpdatedEvent = {
        specversion: '1.0',
        id: ulid(),
        correlationid: command.correlationid,
        time: new Date().toISOString(),
        source: EVENT_SOURCE,
        type: RecipeUpdatedEventType,
        subject,
        data: {
            slug: command.data.slug,
            updates,
        },
        datacontenttype: 'application/json',
    };

    return {
        newState: {
            ...currentRecipe,
            ...updates,
        },
        events: [recipeUpdatedEvent],
    };
};

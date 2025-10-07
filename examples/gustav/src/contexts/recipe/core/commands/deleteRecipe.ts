import { Command } from '@nimbus/core';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import {
    RecipeState,
    recipeSubject,
    requireRecipe,
} from '../domain/recipeAggregate.ts';
import {
    RecipeDeletedEvent,
    RecipeDeletedEventType,
} from '../events/recipeDeleted.ts';

export const DeleteRecipeCommandType =
    'at.overlap.nimbus.delete-recipe' as const;

export type DeleteRecipeCommand =
    & Command<{
        slug: string;
    }>
    & {
        type: typeof DeleteRecipeCommandType;
    };

export const deleteRecipe = (
    command: DeleteRecipeCommand,
    state: RecipeState,
): {
    newState: RecipeState;
    events: RecipeDeletedEvent[];
} => {
    const { EVENT_SOURCE } = getEnv({
        variables: ['EVENT_SOURCE'],
    });

    // Validate recipe exists
    requireRecipe(state);

    const subject = recipeSubject(command.data.slug);

    // Create event
    const recipeDeletedEvent: RecipeDeletedEvent = {
        specversion: '1.0',
        id: ulid(),
        correlationid: command.correlationid,
        time: new Date().toISOString(),
        source: EVENT_SOURCE,
        type: RecipeDeletedEventType,
        subject,
        data: { slug: command.data.slug },
        datacontenttype: 'application/json',
    };

    return {
        newState: null,
        events: [recipeDeletedEvent],
    };
};

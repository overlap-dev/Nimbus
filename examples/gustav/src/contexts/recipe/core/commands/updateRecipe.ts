import { Command } from '@nimbus/core';
import { type EventStore, loadAggregate } from '@nimbus/eventsourcing';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import { Recipe } from '../domain/recipe.ts';
import {
    recipeReducer,
    recipeSubject,
    requireRecipe,
} from '../domain/recipeAggregate.ts';
import {
    RecipeUpdatedEvent,
    RecipeUpdatedEventType,
} from '../events/recipeUpdated.ts';

export const UpdateRecipeCommandType = 'at.overlap.nimbus.update-recipe' as const;

export type UpdateRecipeCommand = Command<{
    slug: string;
    updates: Partial<Recipe>;
}> & {
    type: typeof UpdateRecipeCommandType;
};

export const updateRecipe = async (
    command: UpdateRecipeCommand,
    eventStore: EventStore,
): Promise<Recipe> => {
    const { EVENT_SOURCE } = getEnv({
        variables: ['EVENT_SOURCE'],
    });

    const subject = recipeSubject(command.data.slug);

    // Load current aggregate state by replaying events
    const snapshot = await loadAggregate(
        eventStore,
        subject,
        null,
        recipeReducer,
    );

    // Validate recipe exists
    const currentRecipe = requireRecipe(snapshot.state);

    // Apply updates to get new state
    const updatedRecipe = {
        ...currentRecipe,
        ...command.data.updates,
        slug: currentRecipe.slug, // Prevent slug changes
    };

    // Create event
    const recipeUpdatedEvent: RecipeUpdatedEvent = {
        specversion: '1.0',
        id: ulid(),
        correlationid: command.correlationid,
        time: new Date().toISOString(),
        source: EVENT_SOURCE,
        type: RecipeUpdatedEventType,
        subject,
        data: command.data.updates,
        datacontenttype: 'application/json',
    };

    // Write event
    await eventStore.writeEvents([
        {
            source: recipeUpdatedEvent.source,
            subject: recipeUpdatedEvent.subject,
            type: recipeUpdatedEvent.type,
            data: recipeUpdatedEvent.data,
        },
    ]);

    return updatedRecipe;
};

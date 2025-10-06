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

    // Prevent slug changes
    const updates: Partial<Recipe> = {
        ...command.data,
    };
    if (updates.slug) {
        delete updates.slug;
    }

    // Apply updates to get new state
    const updatedRecipe = {
        ...currentRecipe,
        ...updates,
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
        data: updates,
        datacontenttype: 'application/json',
    };

    // Write event with optimistic concurrency control
    // Use isSubjectOnEventId to ensure no other updates happened since we read
    await eventStore.writeEvents(
        [
            recipeUpdatedEvent,
        ],
        {
            preconditions: snapshot.lastEventId
                ? [
                    {
                        type: 'isSubjectOnEventId',
                        payload: {
                            subject,
                            eventId: snapshot.lastEventId,
                        },
                    },
                ]
                : undefined,
        },
    );

    return updatedRecipe;
};

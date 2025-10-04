import { Command, InvalidInputException } from '@nimbus/core';
import { type EventStore, loadAggregate } from '@nimbus/eventsourcing';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import { Recipe } from '../domain/recipe.ts';
import { recipeReducer, recipeSubject } from '../domain/recipeAggregate.ts';
import {
    RecipeAddedCommandType,
    RecipeAddedEvent,
} from '../events/recipeAdded.ts';

export const AddRecipeCommandType = 'at.overlap.nimbus.app-recipe' as const;

export type AddRecipeCommand = Command<Recipe> & {
    type: typeof AddRecipeCommandType;
};

export const addRecipe = async (
    command: AddRecipeCommand,
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

    // Validate recipe doesn't already exist
    if (snapshot.state !== null) {
        throw new InvalidInputException('Recipe already exists', {
            errorCode: 'DUPLICATE_RECIPE',
            reason:
                'A recipe with this slug already exists. The slug for each recipe must be unique, please choose a different slug.',
        });
    }

    // Create event
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

    // Write event
    await eventStore.writeEvents([
        {
            source: recipeAddedEvent.source,
            subject: recipeAddedEvent.subject,
            type: recipeAddedEvent.type,
            data: recipeAddedEvent.data,
        },
    ]);

    return command.data;
};

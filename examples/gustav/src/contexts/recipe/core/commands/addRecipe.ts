import { Command, InvalidInputException } from '@nimbus/core';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import { EventStore } from '../../../../shared/ports/eventStore.ts';
import { Recipe } from '../domain/recipe.ts';
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
        variables: ['EVENT_SOURCE', 'EVENT_TYPE_PREFIX'],
    });

    const recipeAddedEvent: RecipeAddedEvent = {
        specversion: '1.0',
        id: ulid(),
        correlationid: command.correlationid,
        time: new Date().toISOString(),
        source: EVENT_SOURCE,
        type: RecipeAddedCommandType,
        subject: `/recipes/${command.data.slug}`,
        data: command.data,
        datacontenttype: 'application/json',
        // TODO: add dataschema
    };

    const replayedEvents = await eventStore.readEvents(
        recipeAddedEvent.subject,
    );

    if (replayedEvents.length > 0) {
        throw new InvalidInputException('Recipe already exists', {
            errorCode: 'DUPLICATE_RECIPE',
            reason:
                'A recipe with this slug already exists. The slug for each recipe must be unique, please choose a different slug.',
        });
    }

    const writtenEvents = await eventStore.writeEvents([
        {
            source: recipeAddedEvent.source,
            subject: recipeAddedEvent.subject,
            type: recipeAddedEvent.type,
            data: recipeAddedEvent.data,
        },
    ]);

    console.log('writtenEvents', writtenEvents);

    // TODO: Next work on the readModels and the projectors which update the readModels based on the events.
    // On application startup we need to replay all events to rebuild the readModels.

    return command.data;
};

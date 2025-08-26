import {
    AuthContext,
    Command,
    createEvent,
    InvalidInputException,
} from '@nimbus/core';
import { getEnv } from '@nimbus/utils';
import { z } from 'zod';
import { EventStore } from '../../../../shared/ports/eventStore.ts';
import { Recipe } from '../domain/recipe.ts';
import { RecipeAddedEvent } from '../events/recipeAdded.ts';
import { RecipeEventBus } from '../ports/recipeEventBus.ts';

export const AddRecipeCommand = Command(
    z.literal('recipe.add'),
    Recipe,
    AuthContext,
);
export type AddRecipeCommand = z.infer<typeof AddRecipeCommand>;

export const addRecipe = async (
    command: AddRecipeCommand,
    eventStore: EventStore,
    eventBus: RecipeEventBus,
): Promise<Recipe> => {
    const { EVENT_SOURCE, EVENT_TYPE_PREFIX } = getEnv({
        variables: ['EVENT_SOURCE', 'EVENT_TYPE_PREFIX'],
    });

    const recipeAddedEvent = createEvent<RecipeAddedEvent>({
        source: EVENT_SOURCE,
        subject: `/recipes/${command.data.payload.slug}`,
        type: `${EVENT_TYPE_PREFIX}.recipe-added`,
        data: command.data.payload,
        datacontenttype: 'application/json',
    });

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

    eventBus.putEvent<RecipeAddedEvent>(recipeAddedEvent);
    // TODO: Next work on the readModels and the projectors which update the readModels based on the events.
    // On application startup we need to replay all events to rebuild the readModels.

    return command.data.payload;
};

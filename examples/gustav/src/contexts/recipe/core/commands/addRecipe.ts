import {
    Command,
    ConcurrencyException,
    InvalidInputException,
} from '@nimbus/core';
import { type EventStore } from '@nimbus/eventsourcing';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import { Recipe } from '../domain/recipe.ts';
import { recipeSubject } from '../domain/recipeAggregate.ts';
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

    // Write event with optimistic concurrency control
    // Use isSubjectPristine to ensure this is the first event for this subject
    try {
        await eventStore.writeEvents(
            [
                recipeAddedEvent,
            ],
            {
                preconditions: [
                    {
                        type: 'isSubjectPristine',
                        payload: { subject },
                    },
                ],
            },
        );
    } catch (error) {
        console.log('###error', error);
        // Handle concurrency conflict for duplicate recipe
        if (error instanceof ConcurrencyException) {
            throw new InvalidInputException('Recipe already exists', {
                errorCode: 'DUPLICATE_RECIPE',
                reason:
                    'A recipe with this slug already exists. The slug for each recipe must be unique, please choose a different slug.',
            });
        }
    }

    return command.data;
};

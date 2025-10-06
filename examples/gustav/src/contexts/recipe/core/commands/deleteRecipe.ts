import { Command } from '@nimbus/core';
import { type EventStore, loadAggregate } from '@nimbus/eventsourcing';
import { getEnv } from '@nimbus/utils';
import { ulid } from '@std/ulid';
import {
    recipeReducer,
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

export const deleteRecipe = async (
    command: DeleteRecipeCommand,
    eventStore: EventStore,
): Promise<void> => {
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
    requireRecipe(snapshot.state);

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

    // Write event with optimistic concurrency control
    // Use isSubjectOnEventId to ensure no other updates happened since we read
    await eventStore.writeEvents(
        [
            recipeDeletedEvent,
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
};

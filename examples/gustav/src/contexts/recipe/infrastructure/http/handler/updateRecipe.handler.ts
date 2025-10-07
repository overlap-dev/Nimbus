import { MessageHandler } from '@nimbus/core';
import { loadAggregate } from '@nimbus/eventsourcing';
import { eventStore } from '../../../../../shared/infrastructure/eventStore.ts';
import {
    updateRecipe,
    UpdateRecipeCommand,
} from '../../../core/commands/updateRecipe.ts';
import { Recipe } from '../../../core/domain/recipe.ts';
import {
    recipeReducer,
    recipeSubject,
} from '../../../core/domain/recipeAggregate.ts';

export const updateRecipeHandler: MessageHandler<
    UpdateRecipeCommand,
    Recipe
> = async (command) => {
    const subject = recipeSubject(command.data.slug);

    // Load current aggregate state by replaying events
    const snapshot = await loadAggregate(
        eventStore,
        subject,
        null,
        recipeReducer,
    );

    const { newState, events } = updateRecipe(
        command,
        snapshot.state,
    );

    // Write event with optimistic concurrency control
    // Use isSubjectOnEventId to ensure no other updates happened since we read
    await eventStore.writeEvents(events, {
        preconditions: snapshot.lastEventId !== undefined
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
    });

    return newState;
};

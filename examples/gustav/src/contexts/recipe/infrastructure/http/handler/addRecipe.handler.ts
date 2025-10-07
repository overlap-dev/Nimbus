import { MessageHandler } from '@nimbus/core';
import { loadAggregate } from '@nimbus/eventsourcing';
import { eventStore } from '../../../../../shared/infrastructure/eventStore.ts';
import {
    addRecipe,
    AddRecipeCommand,
} from '../../../core/commands/addRecipe.ts';
import { Recipe } from '../../../core/domain/recipe.ts';
import {
    recipeReducer,
    recipeSubject,
} from '../../../core/domain/recipeAggregate.ts';

export const addRecipeHandler: MessageHandler<
    AddRecipeCommand,
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

    const { newState, events } = addRecipe(
        command,
        snapshot.state,
    );

    // Write event with optimistic concurrency control
    // In case we already have events for this subject, we use isSubjectOnEventId
    // In case we don't have any events for this subject, we use isSubjectPristine
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
            : [
                {
                    type: 'isSubjectPristine',
                    payload: {
                        subject,
                    },
                },
            ],
    });

    return newState;
};

import { MessageHandler } from '@nimbus/core';
import { loadAggregate } from '@nimbus/eventsourcing';
import { eventStore } from '../../../../../shared/infrastructure/eventStore.ts';
import {
    deleteRecipe,
    DeleteRecipeCommand,
} from '../../../core/commands/deleteRecipe.ts';
import {
    recipeReducer,
    recipeSubject,
} from '../../../core/domain/recipeAggregate.ts';

export const deleteRecipeHandler: MessageHandler<
    DeleteRecipeCommand,
    void
> = async (command) => {
    const subject = recipeSubject(command.data.slug);

    // Load current aggregate state by replaying events
    const snapshot = await loadAggregate(
        eventStore,
        subject,
        null,
        recipeReducer,
    );

    const { events } = deleteRecipe(
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
};

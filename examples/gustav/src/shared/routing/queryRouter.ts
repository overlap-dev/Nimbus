import { createRouter } from '@nimbus/core';
import { GetRecipeQueryType } from '../../contexts/recipe/core/queries/getRecipe.ts';
import { getRecipeHandler } from '../../contexts/recipe/infrastructure/router/getRecipe.handler.ts';

// TODO: We want to rework the NimbusRouter to be a class and we create an instance
// Then we add a registerCommand method that handles schema registration on the validator and we get rid of the handlerMap this way.
// We want to implement a default inputLogFunc that logs the input to the console.
// If one wants to omit input logs one can pass a function that does nothing.

// Later on we need some helper for bridging the NimbusRouter to an Oak Route. Or other frameworks Routers.

export const queryRouter = createRouter({
    type: 'query',
    handlerMap: {
        [GetRecipeQueryType]: {
            handler: getRecipeHandler,
            allowUnsafeInput: true,
        },
    },
});

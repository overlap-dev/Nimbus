import { NimbusOakRouter } from '@nimbus/oak';
import { AddRecipeCommandType } from '../../core/commands/addRecipe.ts';
import { GetRecipeQueryType } from '../../core/queries/getRecipe.ts';
import { commandRouter } from './commandRouter.ts';
import { queryRouter } from './queryRouter.ts';
import { AddRecipeCommandSchemaUrl } from './schemas/addRecipeCommandSchema.ts';
import { GetRecipeQuerySchemaUrl } from './schemas/getRecipeQuerySchema.ts';

export const recipeRouter = new NimbusOakRouter();

// POST /recipes - Add a new recipe
recipeRouter.command({
    path: '/',
    messageType: AddRecipeCommandType,
    router: commandRouter,
    dataschema: AddRecipeCommandSchemaUrl,
    // extractData defaults to reading JSON body
});

// GET /recipes/:slug - Get a recipe by slug
recipeRouter.query({
    path: '/:slug',
    messageType: GetRecipeQueryType,
    router: queryRouter,
    extractData: (ctx) => ({
        slug: ctx.params.slug,
    }),
    dataschema: GetRecipeQuerySchemaUrl,
});

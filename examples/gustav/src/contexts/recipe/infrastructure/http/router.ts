import { NimbusOakRouter } from '@nimbus/oak';
import { AddRecipeCommandType } from '../../core/commands/addRecipe.ts';
import { UpdateRecipeCommandType } from '../../core/commands/updateRecipe.ts';
import { GetRecipeQueryType } from '../../core/queries/getRecipe.ts';
import { commandRouter } from './commandRouter.ts';
import { queryRouter } from './queryRouter.ts';
import { AddRecipeCommandSchemaUrl } from './schemas/addRecipeCommandSchema.ts';
import { GetRecipeQuerySchemaUrl } from './schemas/getRecipeQuerySchema.ts';
import { UpdateRecipeCommandSchemaUrl } from './schemas/updateRecipeCommandSchema.ts';

export const recipeRouter = new NimbusOakRouter();

// Add a new recipe
//
// POST /recipes
recipeRouter.command({
    path: '/',
    messageType: AddRecipeCommandType,
    router: commandRouter,
    dataschema: AddRecipeCommandSchemaUrl,
    // extractData defaults to reading JSON body
});

// Update a recipe
//
// PUT /recipes/:slug
recipeRouter.commandPut({
    path: '/:slug',
    messageType: UpdateRecipeCommandType,
    router: commandRouter,
    dataschema: UpdateRecipeCommandSchemaUrl,
    extractData: async (ctx) => {
        const body = await ctx.request.body.json();
        return {
            ...body,
            slug: ctx.params.slug,
        };
    },
});

// Get a recipe by slug
//
// GET /recipes/:slug
recipeRouter.query({
    path: '/:slug',
    messageType: GetRecipeQueryType,
    router: queryRouter,
    dataschema: GetRecipeQuerySchemaUrl,
    extractData: (ctx) => ({
        slug: ctx.params.slug,
    }),
});

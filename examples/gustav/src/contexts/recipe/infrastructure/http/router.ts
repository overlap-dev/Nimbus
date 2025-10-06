import { NimbusOakRouter } from '@nimbus/oak';
import { AddRecipeCommandType } from '../../core/commands/addRecipe.ts';
import { DeleteRecipeCommandType } from '../../core/commands/deleteRecipe.ts';
import { UpdateRecipeCommandType } from '../../core/commands/updateRecipe.ts';
import { GetRecipeQueryType } from '../../core/queries/getRecipe.ts';
import { ListRecipesQueryType } from '../../core/queries/listRecipes.ts';
import { commandRouter } from './commandRouter.ts';
import { queryRouter } from './queryRouter.ts';
import { AddRecipeCommandSchemaUrl } from './schemas/addRecipeCommandSchema.ts';
import { DeleteRecipeCommandSchemaUrl } from './schemas/deleteRecipeCommandSchema.ts';
import { GetRecipeQuerySchemaUrl } from './schemas/getRecipeQuerySchema.ts';
import { ListRecipesQuerySchemaUrl } from './schemas/listRecipesQuerySchema.ts';
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

// Delete a recipe
//
// DELETE /recipes/:slug
recipeRouter.commandDelete({
    path: '/:slug',
    messageType: DeleteRecipeCommandType,
    router: commandRouter,
    dataschema: DeleteRecipeCommandSchemaUrl,
    extractData: (ctx) => ({
        slug: ctx.params.slug,
    }),
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

// List recipes
//
// GET /recipes
recipeRouter.query({
    path: '/',
    messageType: ListRecipesQueryType,
    router: queryRouter,
    dataschema: ListRecipesQuerySchemaUrl,
    extractData: (ctx) => {
        const { limit, offset } = Object.fromEntries(
            ctx.request.url.searchParams,
        );

        return {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        };
    },
});

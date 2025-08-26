import { NimbusOakRouter } from '@nimbus/oak';
import { AddRecipeCommand } from '../../core/commands/addRecipe.ts';
import { GetRecipeQuery } from '../../core/queries/getRecipe.ts';
import { addRecipeHandler } from './addRecipe.handler.ts';
import { getRecipeHandler } from './getRecipe.handler.ts';

export const recipeRouter = new NimbusOakRouter();

recipeRouter.command(
    '/add-recipe',
    'recipe.add',
    AddRecipeCommand,
    addRecipeHandler,
);

recipeRouter.query(
    '/:id',
    'recipe.get',
    GetRecipeQuery,
    getRecipeHandler,
);

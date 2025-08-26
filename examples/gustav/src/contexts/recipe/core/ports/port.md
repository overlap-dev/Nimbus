./src/contexts/<CONTEXT>/core/ports/<PORT>.ts

We define specific ports in here which are the interfaces for external systems implemented in the infrastructure layer of the software. The core defines the contract that is needed by the command and query handler to work.

For example a repository (a thing to store data) might be needed for commands and queries to change data and read data from.
So here in the core we will define a port for it.

```typescript
export interface RecipeRepository {
    insert: (recipe: Recipe) => Recipe;
    update: (recipe: Recipe) => Recipe;
    delete: (id: string) => void;
    getById: (id: string) => Recipe;
    listByOwner: (
        ownerId: string,
        options?: { readonly offset?: number; readonly limit?: number }
    ) => Recipe[];
}
```

No we can use the repository in the command and query handler and know there is an insert method available for us. But we do not care about any implementation details like if it is a PostPostgreSQL, MongoDB or a memory store.

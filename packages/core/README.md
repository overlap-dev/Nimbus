<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus Core

The core package of the Nimbus framework — a small, [CloudEvents](https://cloudevents.io/)-based CQRS toolkit for TypeScript. It provides typed **Commands**, **Queries** and **Events**, a validating **Router** and an in-process **EventBus** with retries and OpenTelemetry instrumentation.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

## Install

```bash
# Deno
deno add jsr:@nimbus-cqrs/core

# NPM
npm install @nimbus-cqrs/core

# Bun
bun add @nimbus-cqrs/core
```

# Examples

The snippets below walk through a tiny "todo" domain so you can see how the core building blocks fit together. Each example is runnable on its own.

For detailed documentation, please refer to the [Nimbus documentation](https://nimbus.overlap.at).

## Command

A **Command** asks the system to *do* something (a write). You declare a [Zod](https://zod.dev/) schema that extends Nimbus' built-in `commandSchema`, write a handler, and register both on the router. Incoming messages are validated against the schema before they reach your handler.

```typescript
import {
    commandSchema,
    createCommand,
    getRouter,
} from '@nimbus-cqrs/core';
import { z } from 'zod';

const ADD_TODO = 'com.example.todo.add';

const addTodoSchema = commandSchema.extend({
    type: z.literal(ADD_TODO),
    data: z.object({
        title: z.string().min(1),
    }),
});
type AddTodoCommand = z.infer<typeof addTodoSchema>;

const handleAddTodo = async (cmd: AddTodoCommand) => {
    // ...persist the todo here...
    return { id: 'todo-1', title: cmd.data.title, status: 'open' };
};

const router = getRouter();
router.register(ADD_TODO, handleAddTodo, addTodoSchema);

const result = await router.route(
    createCommand<AddTodoCommand>({
        type: ADD_TODO,
        source: 'https://app.example.com',
        data: { title: 'Write the README' },
    }),
);

console.log(result);
// { id: 'todo-1', title: 'Write the README', status: 'open' }
```

`createCommand` fills in the boilerplate CloudEvents fields (`id`, `correlationid`, `time`, …) for you, so you only specify the parts that matter to your domain.

## Query

A **Query** asks the system to *read* something. Mechanically it is identical to a Command — same router, same validation, same shape — only the intent differs.

```typescript
import { createQuery, getRouter, querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';

const GET_TODO = 'com.example.todo.get';

const getTodoSchema = querySchema.extend({
    type: z.literal(GET_TODO),
    data: z.object({ id: z.string() }),
});
type GetTodoQuery = z.infer<typeof getTodoSchema>;

const handleGetTodo = async (q: GetTodoQuery) => {
    // ...load the todo from your read model...
    return { id: q.data.id, title: 'Write the README', status: 'open' };
};

const router = getRouter();
router.register(GET_TODO, handleGetTodo, getTodoSchema);

const todo = await router.route(
    createQuery<GetTodoQuery>({
        type: GET_TODO,
        source: 'https://app.example.com',
        data: { id: 'todo-1' },
    }),
);
```

## Event

An **Event** announces that something *has happened*. Events are published to the in-process EventBus, which delivers them to every matching subscriber asynchronously, with exponential-backoff retries on handler errors and built-in OpenTelemetry traces and metrics.

```typescript
import {
    createEvent,
    eventSchema,
    getEventBus,
} from '@nimbus-cqrs/core';
import { z } from 'zod';

const TODO_ADDED = 'com.example.todo.added';

const todoAddedSchema = eventSchema.extend({
    type: z.literal(TODO_ADDED),
    data: z.object({
        id: z.string(),
        title: z.string(),
    }),
});
type TodoAddedEvent = z.infer<typeof todoAddedSchema>;

const eventBus = getEventBus();

eventBus.subscribeEvent<TodoAddedEvent>({
    type: TODO_ADDED,
    handler: async (event) => {
        console.log(`New todo added: ${event.data.title}`);
    },
    onError: (error, event) => {
        console.error(`Failed to handle ${event.id} after retries`, error);
    },
});

eventBus.putEvent(
    createEvent<TodoAddedEvent>({
        type: TODO_ADDED,
        source: 'https://app.example.com',
        subject: '/todos/todo-1',
        data: { id: 'todo-1', title: 'Write the README' },
    }),
);
```

A typical flow is to publish an event from inside a command handler once the write has succeeded — that's how reads, side effects and integrations stay decoupled from the command path.

## Router

A typical app configures a single named router at startup with cross-cutting concerns (logging, correlation IDs, …) and then resolves it from anywhere via `getRouter()`.

```typescript
import { getLogger, getRouter, setupRouter } from '@nimbus-cqrs/core';

setupRouter('default', {
    logInput: (input) => {
        getLogger().debug({
            category: 'Router',
            message: `Routing ${input.type}`,
            correlationId: input.correlationid,
        });
    },
    logOutput: (output) => {
        getLogger().debug({
            category: 'Router',
            message: 'Handler completed',
            data: { output },
        });
    },
});

// Anywhere else in your app:
const router = getRouter('default');
router.register(/* type, handler, schema */);
await router.route(/* command or query */);
```

You can have multiple named routers (for example one per transport) by calling `setupRouter` with different names and resolving them with `getRouter('<name>')`.

# License

Copyright 2024-present Overlap GmbH & Co KG (https://overlap.at)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

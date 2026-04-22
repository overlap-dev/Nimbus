# What is Nimbus?

Nimbus is a lightweight TypeScript framework for building event-driven applications. It provides type-safe messaging patterns (Commands, Queries, Events) following the [CloudEvents](https://cloudevents.io/) specification, with built-in observability powered by [OpenTelemetry](https://opentelemetry.io/).

## Other Topics

-   [The Philosophy behind Nimbus](/guide/philosophy)
-   [The Era of AI](/guide/era-of-ai)
-   [Architecture Recommendation](/guide/architecture-recommendation)

## Who Is This For?

Nimbus is a good fit if you are:

-   Building event-driven applications
-   Looking for explicit, traceable code without hidden magic
-   Wanting built-in observability without complex setup
-   Preferring a lightweight framework over heavyweight solutions

## Key Features

-   **CloudEvents-based messaging** - Commands, Queries, and Events following the industry-standard [CloudEvents](https://cloudevents.io/) specification
-   **Built-in observability** - Logging, tracing, and metrics via [OpenTelemetry](https://opentelemetry.io/) with zero boilerplate
-   **Type-safe validation** - Message validation with [Zod](https://zod.dev/) schemas
-   **MongoDB integration** - Repository pattern and CRUD operations with automatic tracing
-   **Hono middleware** - Ready-to-use middleware for HTTP APIs
-   **Runtime flexibility** - Deno-first with NPM and Bun support

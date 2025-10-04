# Plan and ToDos

## Vision

Have a CLI tool to initialize a new Nimbus project.
This sets up the project structure and installs the necessary dependencies.

The Structure will follow a Domain Driven Design (DDD) approach with a Hexagonal Architecture.

The Source of truth for the API will be an AsyncAPI specification in JSON format.

Based on the AsyncAPI specification the Nimbus framework should register the commands, queries and event on the router structure.
Also the router will provide a route for a health check and routes for a schema registry.
The user now only has to implement the business logic and connects it to the route handlers.

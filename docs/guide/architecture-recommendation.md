# Architecture

Nimbus tries to not be too opinionated and does not enforce a specific architecture or design pattern.

You should pick the parts you need for the problem you are trying to solve.

-   CQRS
-   Event Sourcing
-   Domain Driven Design
-   Hexagonal Architecture
-   Microservices
-   ...

On this page we will recommend an architecture idea that lays a good foundation for your application.

## A Good Foundation

We recommend to build your application around the idea of a **Pure Core** and an **Imperative Shell**. It aligns well with Hexagonal Architecture (Ports & Adapters) and is a good foundation for patterns like CQRS and Event Sourcing.

![Illustration of the pure core imperative shell architecture](/nimbus-pure-core-imperative-shell.svg)

## The Pure Core

The business logic represents the most valuable part of any application. It should be focused, testable, and free from external dependencies.

The pure core contains domain logic that:

-   Can be perfectly discovered and modelled with Domain Driven Design
-   Accepts type-safe inputs and returns type-safe outputs
-   Has no side effects (no I/O operations)
-   Can be tested by running functions with different inputs and comparing outputs - no mocking needed!
-   Represents the unique value proposition of the application

## The Imperative Shell

The shell handles all interactions with the outside world - HTTP requests, database operations, file system access, and other I/O operations. It orchestrates the pure core by providing it with data and persisting the results.

The shell's responsibilities include:

-   Receiving external input (HTTP requests, messages, etc.)
-   Fetching data from external sources
-   Calling pure core functions
-   Persisting results
-   Sending responses

## Flow of Information

Information flows in one direction: **Shell → Core → Shell**

The shell can call the core at any time, but the core never calls the shell. This unidirectional flow ensures that business logic remains pure and testable.

![Illustration of the flow of information](/nimbus-flow-of-information.svg)

In an HTTP API scenario:

1. Shell receives HTTP request
2. Shell fetches necessary data from database
3. Shell calls core business logic
4. Shell persists results to database
5. Shell sends HTTP response

For complex scenarios requiring multiple database queries with business logic in between, core functions can be composed and called sequentially by the shell.

## Testing Recommendation

-   Unit tests for the pure core.
-   E2E tests to ensure the whole system works.

As the name "pure" core already implies, no side effects are allowed. This makes it easy to test the core by running functions with different inputs and comparing outputs - no mocking needed!

Also the core is the most important part of your application as it holds your whole business logic and domain knowledge. So fast and easy to write unit tests give you the most bang for your buck.

End to end tests will ensure all parts of your application work together as expected.

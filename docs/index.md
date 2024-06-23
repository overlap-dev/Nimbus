---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
    name: 'Nimbus'
    text: 'Event-Driven Cloud Framework'
    tagline: Build event-driven applications in the cloud.
    image:
        src: https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/Nimbus.svg
        alt: Nimbus

    actions:
        - theme: brand
          text: What is Nimbus?
          link: /guide/what-is-nimbus
        - theme: alt
          text: Quickstart
          link: /guide/quickstart
        - theme: alt
          text: GitHub
          link: https://github.com/overlap-dev/Nimbus

features:
    - title: Core Concepts
      details: Use commands, events, and queries to build your application.
    - title: Simple Design
      details: No need to wire your brain around complex object-oriented design principles.
    - title: Pure Core - Imperative Shell
      details: The only rule to follow is to keep your core logic pure and side-effect free.
    - title: Infrastructure as Code
      details: Manage the entire cloud infrastructure as code side by side to your application code.
---

# TODO: General ideas to pick up ...

We will build the core with events, commands and queries.

There will be an eventRouter, commandRouter and queryRouter in the core itself. All return an Either<Exception, ResultObject>.

Those routers can be used to build adapters for different frameworks or interfaces. For example Express or Fastify to handle HTTP requests. Or the AWS Lambda invoked by APIGateway etc.

There should be other I/O adapters for databases, queues, etc.

All adapters will be part of specific packages (AWS, MongoDB etc.).

This framework should do most of the heavy lifting to build the imperative shell around the pure core.

For logging we will use pino.

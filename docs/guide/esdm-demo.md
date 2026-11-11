---
description: The esdm-demo example application is a ticketing backend that follows the workflow and the project structure of the Nimbus skills, from the ESDM domain model to the code.
prev:
    text: "In Depth Example"
    link: "/guide/in-depth-example"
next:
    text: "Glossary"
    link: "/guide/glossary"
---

# ESDM Demo

Next to the "eventsourcing-demo" from the [In Depth Example](/guide/in-depth-example) there is a second example application called ["esdm-demo"](https://github.com/overlap-dev/Nimbus/tree/main/examples/esdm-demo). It is the backend of a small ticketing system. A frontend is not included.

The In Depth Example explains the concepts behind Nimbus step by step. The ESDM Demo has a different goal. It shows what a project looks like when it follows the workflow and the structure of the [Nimbus skills](/guide/nimbus-for-ai#skills-for-agents). So this page is not a walkthrough. It tells you what is in the demo and where to look.

## What Is in the Demo

The demo is split into two Bounded Contexts.

-   **ticketing** is the heart of the application. Tickets are created, assigned, moved through their status and archived. A policy starts the work on a ticket as soon as it is assigned. An event handler tells the new assignee by email. A process manager archives a ticket once it has been done for thirty days. A read model serves the ticket list and the ticket detail.
-   **iam** handles login and logout. It works with a fixed list of demo users to keep the focus on the ticketing context.

## Model First, Implement Second

The workflow of the skills is built around [ESDM](https://www.esdm.io/), the Event-Sourced Domain Modeling language. ESDM describes an event-sourced domain as a set of YAML files. It covers the building blocks of Domain Driven Design, CQRS and Event Sourcing like Bounded Contexts, Aggregates, Commands, Events, Process Managers and Read Models. The format is plain enough that humans and coding agents can both read and write it.

The skills treat the ESDM model as the source of truth for your project and work in two steps.

1. **Model first.** The `nimbus-domain-modeling` skill builds the model together with you. It challenges vague terms, checks them against the ubiquitous language and tests the model with concrete scenarios. Every resolved term is written to the ESDM files right away. The model stays free of implementation details so that all stakeholders can understand it.
2. **Implement second.** The `nimbus` skill loads the Nimbus [documentation for agents](/guide/nimbus-for-ai#documentation-for-agents), reads the model and implements every construct the task needs. If a construct is missing or contradicts the task the agent goes back and fixes the model before it writes any code.

The demo keeps the results of both steps side by side.

| Folder              | What you find there                                                                 |
| ------------------- | ----------------------------------------------------------------------------------- |
| `docs/domain-model` | The ESDM model of the two Bounded Contexts and the ESDM schemas.                    |
| `docs/adr`          | The architecture decision records, for example the decision to use EventSourcingDB. |
| `src/api`           | The code that implements the model with Nimbus.                                     |

## The Opinionated Structure

The code follows the [project structure](/guide/nimbus-for-ai#project-structure) of the skills. It mirrors the model, so every construct of the model has one obvious place in the code.

| ESDM model                          | Code                                   |
| ----------------------------------- | -------------------------------------- |
| Aggregate `ticket`                  | `src/api/ticketing/agg-ticket`         |
| Read Model `tickets`                | `src/api/ticketing/rm-tickets`         |
| Process Manager `settled-archive`   | `src/api/ticketing/pm-settled-archive` |
| Dynamic Consistency Boundary `auth` | `src/api/iam/dcb-auth`                 |
| External System `mailing`           | `src/api/shared/ext-mailing`           |

A good way to explore the demo is to pick one construct, read its ESDM file and then open the matching folder in the code. The policy `start-work-on-assignment` of the `ticket` Aggregate is a small one to start with.

The rules behind this structure and the mapping of every ESDM construct to the Nimbus building blocks are described on the [Nimbus for AI](/guide/nimbus-for-ai#project-structure) page.

::: tip Use the skills in your own project
The [Nimbus for AI](/guide/nimbus-for-ai#installation) page shows how to install the skills with the `npx skills` commands.
:::

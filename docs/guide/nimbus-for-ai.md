---
description: Event Sourcing gives AI systems rich, time-ordered domain history. Nimbus ships llms.txt and agent skills that help coding agents learn and apply the framework accurately.
---

# Nimbus for AI

The conversation around AI today is dominated by ever larger models and increasingly autonomous agents. It is easy to get caught up in the hype and lose sight of what actually makes these systems useful.

AI is not a magic wand. No LLM, no matter how capable, can answer meaningful questions about your business or solve real problems if the data it relies on is incomplete, inconsistent, or missing the context of _how_ things came to be. The model is only as good as what you feed it.

This is where event-driven architecture, and in particular **Event Sourcing**, becomes a strategic asset. Instead of storing only the current state of your system, Event Sourcing captures every fact that ever happened as an immutable event. The result is a complete, time-ordered history of your business domain - exactly the kind of high-quality, contextual data that AI systems thrive on.

## Nimbus as AI Enabler

Nimbus is meant to build applications based on messages: [Commands](/guide/core/commands), [Events](/guide/core/events), and [Queries](/guide/core/queries). This is the perfect fit to combine it with Domain Driven Design and Event Sourcing.

This way you are building the data foundation that makes future AI use cases - from analytics and forecasting to agentic workflows - viable rather than aspirational.

## Documentation for Agents

Coding agents can load the full Nimbus guide from a single URL:

-   [llms.txt](https://nimbus.overlap.at/llms.txt) — link-rich index of every guide page (Markdown)
-   [llms-full.txt](https://nimbus.overlap.at/llms-full.txt) — entire guide in one file

Use the [Glossary](/guide/glossary) to pin terminology and reduce hallucinations. Per-page Markdown mirrors are available at the same path with a `.md` suffix (for example `/guide/core/commands.md`).

## Skills for Agents

The documentation tells a coding agent what Nimbus is. Skills tell it how to work with Nimbus. A skill is a set of reusable instructions that an agent loads whenever a task matches the description of the skill.

Nimbus ships two skills in the [skills](https://github.com/overlap-dev/Nimbus/tree/main/skills) folder of the repository.

| Skill                    | What it does                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| `nimbus-domain-modeling` | Creates and sharpens the domain model of your project together with you.  |
| `nimbus`                 | Plans and implements backend code with Nimbus based on that domain model. |

### Installation

The skills are installed with the [skills CLI](https://github.com/vercel-labs/skills). Run the following command from the root of your project.

```bash
npx skills add overlap-dev/Nimbus
```

The CLI asks which skills you want to install and which coding agents should get them. The two skills are made to work together so we recommend to install both.

To install only one of them use the `--skill` option.

```bash
npx skills add overlap-dev/Nimbus --skill nimbus
```

Skills are installed into the current project by default. Add the `-g` option to make them available across all of your projects.

To get the latest version of the skills later on run the update command.

```bash
npx skills update
```

### An Opinionated Workflow

The Nimbus packages try to not be too opinionated. The skills are different. A coding agent delivers better and more consistent results when it follows clear rules. So the skills make the decisions up front and follow one fixed workflow.

This workflow is built around [ESDM](https://www.esdm.io/), the Event-Sourced Domain Modeling language. ESDM describes an event-sourced domain as a set of YAML files. It covers the building blocks of Domain Driven Design, CQRS and Event Sourcing like Bounded Contexts, Aggregates, Commands, Events, Process Managers and Read Models. The format is plain enough that humans and coding agents can both read and write it.

The skills treat the ESDM model as the source of truth for your project and work in two steps.

1. **Model first.** The `nimbus-domain-modeling` skill builds the model together with you. It challenges vague terms, checks them against the ubiquitous language and tests the model with concrete scenarios. Every resolved term is written to the ESDM files right away. The model stays free of implementation details so that all stakeholders can understand it.
2. **Implement second.** The `nimbus` skill loads the documentation mentioned above, reads the model and implements every construct the task needs. If a construct is missing or contradicts the task the agent goes back and fixes the model before it writes any code.

The modeling skill needs the `esdm` binary on your `PATH`. Follow the [ESDM installation guide](https://www.esdm.io/getting-started/installing-esdm/) to set it up.

### Project Structure

Both skills follow a given project structure. The domain model and the architecture decision records live in the `docs` folder and the code lives in `src`.

```
/
├── docs/
│   ├── adr/                   # architecture decision records
│   └── domain-model/
│       ├── schemas/           # created by `esdm add-schema`
│       └── model/             # the ESDM model
└── src/
```

You do not need to create these folders yourself. The modeling skill creates them as soon as there is something to write down.

The code mirrors the model. Every Bounded Context is a top-level folder. Every consistency unit of the model is a folder inside its Bounded Context and a prefix names its ESDM kind.

| Prefix | ESDM kind                    |
| ------ | ---------------------------- |
| `agg-` | Aggregate                    |
| `rm-`  | Read Model                   |
| `pm-`  | Process Manager              |
| `dcb-` | Dynamic Consistency Boundary |
| `ext-` | External System              |

Inside of each folder the code is split into a **Pure Core** and an **Imperative Shell** as described on the [Architecture](/guide/architecture) page. A shortened example for a ticketing application looks like this.

```
src/
├── ticketing/                 # Bounded Context
│   ├── agg-ticket/            # Aggregate
│   │   ├── core/
│   │   │   ├── domain/
│   │   │   ├── commands/
│   │   │   └── events/
│   │   └── shell/
│   │       ├── commands/
│   │       ├── policies/
│   │       └── event-handlers/
│   ├── rm-tickets/            # Read Model
│   └── pm-settled-archive/    # Process Manager
├── shared/                    # code used by more than one Bounded Context
└── main.ts
```

Projects that also contain a frontend keep the backend in `src/api` or `src/server` and follow the same layout inside of that folder.

Nimbus does not ship classes like `Aggregate` or `ProcessManager`. So the `nimbus` skill maps every ESDM construct onto a composition of Nimbus building blocks.

| ESDM            | Nimbus                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aggregate       | One **subject** stream. The state and its reducer live in the core next to one pure function per command. The shell handler replays the events, calls the core and writes the new events with **preconditions**. |
| Read Model      | A **projection** in the shell that writes to a MongoDB **repository**. Queries read from that repository only.                                                                                                   |
| Process Manager | The process state and its reducer live in the core. Shell event handlers observe events, persist the process state and send commands through the command **router**.                                             |
| Policy          | A stateless handler in the shell of the unit that owns the target command. It observes an event and issues that command through the command **router**.                                                          |

The complete rules are part of the `nimbus` skill. Have a look at [PROJECT-STRUCTURE.md](https://github.com/overlap-dev/Nimbus/blob/main/skills/nimbus/PROJECT-STRUCTURE.md) and [ESDM-MAPPING.md](https://github.com/overlap-dev/Nimbus/blob/main/skills/nimbus/ESDM-MAPPING.md) for all the details.

This structure is stricter than the layout of the demo in the [In Depth Example](/guide/in-depth-example). When the two disagree the structure of the skill wins.

::: tip See it in action
The example application [esdm-full-example](https://github.com/overlap-dev/Nimbus/tree/main/examples/esdm-full-example) shows this structure in a complete application. It contains the ESDM model, the architecture decision records and the code that implements them.
:::

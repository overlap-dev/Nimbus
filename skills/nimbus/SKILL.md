---
name: nimbus
description: >-
  Nimbus conventions for backend implementation and architecture. Use when
  implementing or planning backend code with Nimbus, when a task involves
  event sourcing, CQRS, EventSourcingDB or an ESDM domain model, or when
  another skill needs Nimbus conventions.
---

# Nimbus 

Implement from the official guide and the project's ESDM model — **Pure Core** inside an **Imperative Shell**.

## 1. Load official docs

Before changing Nimbus-related code, load framework docs in this order:

1. [llms.txt](https://nimbus.overlap.at/llms.txt) — index of guide pages
2. [llms-full.txt](https://nimbus.overlap.at/llms-full.txt) — full guide in one file (preferred when online)
3. Per-topic `.md` URLs from the index (e.g. [Commands](https://nimbus.overlap.at/guide/core/commands.md))
4. [Glossary](https://nimbus.overlap.at/guide/glossary.md) — use these definitions literally, not generic CQRS literature
5. [In Depth Example](https://nimbus.overlap.at/guide/in-depth-example.md) + [eventsourcing-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/eventsourcing-demo) when unsure of structure

**Done when:** every construct you are about to touch has its guide page (or `llms-full`) in context, and you are using Glossary terms literally.

## 2. Read the domain model

Read the relevant constructs in `docs/domain-model/` for the work in scope.

**Done when:** every ESDM construct you will implement is located and its ubiquitous-language names are known.

## 3. Structure and map

Follow [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) (wins over official example layouts). Implement each construct as mapped in [ESDM-MAPPING.md](./ESDM-MAPPING.md) — ESDM names the _what_; Nimbus Glossary names the _how_.

**Done when:** every file sits in the correct kind folder, and every in-scope ESDM construct has a matching Nimbus composition from the mapping.

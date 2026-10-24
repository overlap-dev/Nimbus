# ESDM → Nimbus

How ESDM constructs map onto Nimbus. Prefer names and rules from `docs/domain-model/`; implement with [Nimbus Glossary](https://nimbus.overlap.at/guide/glossary.md) meanings, not generic CQRS literature.

Nimbus has no Aggregate / Policy / Process Manager classes — each construct is a composition of **Pure Core** (schemas, reducers, pure functions) and **Imperative Shell** (handlers, `writeEvents` / `readEvents`, observers, HTTP). Folder shapes: [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md).

## Consistency units

| ESDM                             | Nimbus                                                                                                                                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate**                    | One **subject** stream. `core/domain/<name>.state.ts` holds state + `applyEventToState`. Each `core/commands/<command>.command.ts` holds the schema and pure function (state + command → events). Shell handler: replay → core → `writeEvents` with **preconditions**. |
| **Dynamic Consistency Boundary** | Same folder shape as an Aggregate; shell derives the subject set from the command. No fixed precondition recipe — see below.                                                                                                                                           |
| **Process Manager**              | `pm-` unit: process `state` + `applyEventToState` in core; shell event handlers observe, persist instance state, emit **commands** via the command **router**.                                                                                                         |
| **Read Model**                   | `rm-` unit: shell **projection** + MongoDB **repository** + **collection** definition; **queries** read the repository only.                                                                                                                                           |

## Messages

| ESDM        | Nimbus                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Command** | CloudEvents **command** — schema + pure logic in `*.command.ts`, shell handler, register on command **router**.                                   |
| **Event**   | CloudEvents **event** — `*.event.ts`, require **subject** (`/<bounded-context>/<stream>/<id>`, e.g. `/iam/users/{id}`). Append via `writeEvents`. |
| **Query**   | CloudEvents **query** — `*.query.ts`, shell handler reads **repository**, register on query **router**.                                           |

## Behaviour beside aggregates

| ESDM               | Nimbus                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Policy**         | Stateless observer handler in the target unit's `shell/policies/` — see [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) (Policies). |
| **Event Handler**  | Source unit `shell/event-handlers/` — egress via `ext-<system>/shell/client.ts`. Idempotency in the shell.              |
| **Domain Service** | `core/domain/<name>.service.ts` — pure, no I/O; called from command/process-manager core.                               |

## Structural / vocabulary

| ESDM                | Nimbus                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Bounded Context** | Top-level folder under the backend root.                                                      |
| **Entity**          | Identity + Zod schema in core — not its own stream.                                           |
| **Value Object**    | Zod schema in `core/domain/*.value-object.ts`.                                                |
| **Actor**           | Enforced in the shell (auth), not as an aggregate invariant.                                  |
| **External System** | `ext-<system>/` in the owning context — client (egress) / webhook HTTP (ingress).             |
| **Context Mapping** | Place by mapping pattern — [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) (Context mappings). |

## Dynamic Consistency Boundary

An Aggregate locks **one** subject. A DCB locks a **runtime-chosen set** of resources in one atomic `writeEvents`. There is no fixed precondition pattern — that is the point of a DCB: the boundary follows the use case.

**Rule of thumb:** compose whatever EventSourcingDB preconditions the case needs (`isSubjectPristine`, `isSubjectPopulated`, `isSubjectOnEventId`, `isEventQlQueryTrue`, …) so every involved resource is covered before the write commits.

## Flow reminder

Shell → Core → Shell. Core never calls shell.

---
status: accepted
---

# Every Event Carries Its Actor

Every event's `data` carries an `actor`: the **user-id** of the User whose command produced the event, or the literal string **`system`** when the domain itself emitted it — a policy, a process manager, a timer, a scheduler, or an operator-run migration — with no User behind the command.

We chose this because the value of the event log is the history of operational facts ([ADR-0001](0001-event-sourcing-with-eventsourcingdb.md)), and _who did it_ is part of the fact, not an afterthought: audit questions ("who assigned this Ticket?", "who changed the Ticket status?") must be answerable from the events alone, without a second log.

## Consequences

- **`actor` is either a user-id or `system`.** Because user-ids are UUIDs, the reserved value cannot collide. Non-human ESDM actors like the settled-archive watch always emit `system`. A policy or process manager that reacts to a human's command still records that human's user-id.
- **Read models may show "changed by".** The user-id is resolved to a display name outside this bounded context.
- **Every ESDM event lists `actor` in `data`** as a required property. The linter cannot enforce this; code review does.

---
status: accepted
---

# API URL and HTTP-Method Convention

Every command is a `POST` and every query is a `GET`. No other HTTP verb appears on the API. Routes are flat and carry no path parameters. Identifiers travel in the request body (commands) or the query string (queries).

Routes are under a fixed three-segment scheme:

```
/api/v1/{bounded-context}/{aggregate|dcb|read-model}/{command|query}
```

All segments are lowercase kebab-case: the bounded context is its canonical name (`ticketing`), the aggregate/DCB or read-model segment names the ESDM element that owns the operation, and the final segment is the command or query name — an imperative verb phrase, never a type name like `AssignTicketCommand`.

**Examples:**
- `POST /api/v1/ticketing/ticket/assign`
- `GET /api/v1/ticketing/tickets/get-ticket`

We chose this over REST-ish resource verbs (`PATCH`/`PUT`/`DELETE`) because the backend is CQRS/event-sourced ([ADR-0003](0003-nimbus-as-backend-framework.md)): every write is a named command and every read a named query, so `POST`-command / `GET`-query maps one-to-one onto the model with no per-route argument about which verb "fits" (`ChangeStatus` → `PATCH`? `Archive` → `DELETE`?). Dropping path parameters keeps every route a literal, greppable string that mirrors the ESDM catalogue, and lets a command target be authorized from the body rather than the URL.

## Considered Options

- **REST-ish verbs and resource paths** (`PATCH /tickets/:id/status`, `DELETE /tickets/:id`) — rejected: forces a verb-fit decision per command and splits one ESDM command across HTTP methods.
- **Flat command paths with the ID as a path parameter** (`POST /ticketing/ticket/:ticket-id/assign`) — rejected: the chosen scheme keeps IDs in the body so routes stay parameter-free and uniform.

## Consequences

- **New command/query URLs are mechanical.** Adding an ESDM command or query fixes its route with no naming debate.
- **Command and query segments can differ for the same concept.** Writes live under the `ticket` aggregate (`assign`) while reads are queries on the `tickets` read model (`get-ticket`, `list-tickets`). This is expected: the segment names the owning ESDM element, and writes and reads have different owners under CQRS.
- **`GET` bodies are never used.** Query inputs (filters, ids, paging) are query-string parameters.

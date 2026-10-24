# Project structure

Opinionated layout for Nimbus apps. Where this disagrees with official examples, this file wins.

## Roots

| Repository shape   | Backend root                | Composition (`main.ts`, `http.ts`) | Frontend                                                                                      |
| ------------------ | --------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Backend only       | `src/`                      | `src/`                             | —                                                                                             |
| Backend + frontend | `src/api/` or `src/server/` | `src/`                             | `src/frontend/` — only Nimbus touchpoint is `src/frontend/http.ts` (routes that serve the UI) |

In combined repos, `src/main.ts` and `src/http.ts` stay at `src/` — they compose the backend root and the frontend. Backend wiring (`mongodb.ts`, `eventsourcingdb.ts`, `health.ts`, backend `http.ts`, routers, bounded contexts) lives under the backend root.

Everything below applies inside the backend root, except composition files which follow the table above.

## Layout

**Bounded Contexts** sit at the top of the backend root. Cross-context code lives in `shared/`. Inside each unit, **Pure Core** and **Imperative Shell** stay apart ([Architecture](https://nimbus.overlap.at/guide/architecture.md)).

### Folder prefixes (ESDM kind)

| Prefix | ESDM kind                    |
| ------ | ---------------------------- |
| `agg-` | Aggregate                    |
| `rm-`  | Read Model                   |
| `pm-`  | Process Manager              |
| `dcb-` | Dynamic Consistency Boundary |
| `ext-` | External System              |

```
<backend-root>/
├── <bounded-context>/
│   ├── agg-<name>/                # see kind variants below
│   ├── rm-<name>/
│   ├── pm-<name>/
│   ├── dcb-<name>/
│   ├── ext-<system>/
│   ├── command.router.ts          # composes unit routers → backend root
│   ├── query.router.ts
│   └── http.ts                    # composes unit + ext HTTP → backend root
├── shared/                        # cross-context only
├── mongodb.ts
├── eventsourcingdb.ts             # wires observers → unit shell handlers
├── health.ts
├── command.router.ts
├── query.router.ts
└── http.ts                        # backend Hono app (contexts + health)
```

**Composition** (always at `src/`, never under the backend root in combined repos):

```
src/
├── api/                           # or server/ — backend root (layout above)
│   └── …
├── frontend/
│   └── http.ts                    # UI-serving routes
├── http.ts                        # composes api + frontend → app
└── main.ts                        # process entry
```

Backend-only repos flatten this: composition files live in `src/` alongside the backend layout (no `api/` / `frontend/` split).

### `agg-<name>`

```
agg-<name>/
├── core/
│   ├── domain/
│   │   ├── <name>.value-object.ts
│   │   ├── <name>.entity.ts
│   │   ├── <name>.service.ts
│   │   └── <name>.state.ts        # state type + applyEventToState
│   ├── commands/
│   │   └── <command>.command.ts   # schema + pure fn (state + command → events)
│   └── events/
│       └── <event>.event.ts
└── shell/
    ├── commands/
    │   └── <command>.handler.ts   # load/replay → core → writeEvents
    ├── policies/
    │   └── <policy>.handler.ts    # owned here when this unit's command is the target
    ├── event-handlers/
    │   └── <event-handler>.handler.ts
    ├── stores/                    # If operational stores in addition to the event store are needed
    │   └── <name>.repository.ts   # MongoDBRepository subclass
    │   └── <name>.collection.ts   # deployMongoCollection (schema + indexes)
    ├── http.ts
    └── command.router.ts
```

### `rm-<name>`

```
rm-<name>/
├── core/
│   ├── domain/                    # read-document shapes / VOs as needed
│   │   └── <name>.ts
│   └── queries/
│       └── <query>.query.ts
└── shell/
    ├── queries/
    │   └── <query>.handler.ts
    ├── projections/
    │   └── <projection>.projection.ts
    ├── stores/
    │   └── <name>.repository.ts   # MongoDBRepository subclass
    │   └── <name>.collection.ts   # deployMongoCollection (schema + indexes)
    ├── http.ts
    └── query.router.ts
```

### `pm-<name>`

```
pm-<name>/
├── core/
│   ├── domain/
│   │   └── <name>.state.ts        # process state + applyEventToState
│   ├── commands/                  # commands this PM emits (schemas + pure builders)
│   │   └── <command>.command.ts
│   └── events/                    # events this PM publishes, if any
│       └── <event>.event.ts
└── shell/
    ├── events/
    │   └── <event>.handler.ts     # observe → transition → route commands
    ├── http.ts                    # only if the PM exposes HTTP
    └── command.router.ts          # only if the PM accepts commands
```

Persist process instances in Mongo via a repository under `shell/stores/` when state must survive restarts.

### `dcb-<name>`

Same shape as `agg-<name>`. Shell handlers derive the subject set from the command and compose EventSourcingDB **preconditions** for every involved resource — no fixed recipe; see [ESDM-MAPPING.md](./ESDM-MAPPING.md).

### `ext-<system>`

```
ext-<system>/
├── core/                          # optional: pure translators / DTOs
└── shell/
    ├── client.ts                  # egress API
    └── http.ts                    # ingress webhooks → commands/events
```

Place in the **Bounded Context that owns the relationship**. Egress is invoked from unit `event-handlers/` (side effects leave the model). Ingress is composed via context `http.ts`.

Use `shared/ext-<system>/` only when no single context owns the system.

### Context mappings

Code lives with whoever owns the translation or contract. Read the mapping kind from `docs/domain-model/` (context-mappings), then place modules accordingly.

| Pattern                   | Where                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anti-corruption-layer** | Downstream edge: `<downstream>/map-<upstream>/`                                                                                                         |
| **Customer-supplier**     | Customer (downstream) edge: `<customer>/map-<supplier>/`                                                                                                |
| **Conformist**            | Downstream consumes upstream shapes directly; add `<downstream>/map-<upstream>/` only if a thin adapter is unavoidable                                  |
| **Open-host-service**     | Upstream publishes the host API (facade under `<upstream>/`, often via its `http.ts` / routers)                                                         |
| **Published-language**    | Contract owned by the publisher (upstream, or `shared/contracts/<name>/` when jointly published); consumers translate at their edge unless they conform |
| **Shared-kernel**         | `shared/kernel-<name>/` — joint ownership                                                                                                               |
| **Partnership**           | Edge modules on both sides; `shared/` only for the thin jointly owned slice                                                                             |
| **Separate-ways**         | No integration module                                                                                                                                   |

When the other party is an **External System**, `ext-<system>/` _is_ the edge — a parallel `map-` folder is redundant.

Default for ACL / customer-supplier: adapting side's context edge, not `shared/`.

## Subjects

Pattern: `/<bounded-context>/<stream>/<id>`

- The stream segment is the consistency unit’s name in plural form. The kind prefix is stripped. E.g. (`agg-user` → `/iam/users`, not `/iam/user`).
- One aggregate instance = one subject stream; every event for that instance shares the subject.
- Observers subscribe at `/<bounded-context>/<stream>` with `recursive: true` to receive all instances.

```
/iam/users/01HZX…         # agg-user instance
/iam/users                # observer prefix (recursive)
/iam/onboarding/01HZY…    # pm-onboarding instance (correlation id)
```

## Message types

Pattern: `<reverse-domain>.<bounded-context>.<consistency-unit>.<message>`

- `com.example.iam.user.register`
- `com.example.iam.user.registered`
- `com.example.iam.users.get-user`

## Policies

Owned by the **target** consistency unit (the unit whose command they issue). Live in that unit's `shell/policies/`, observe the source event and issue the **command** via the command router. The source unit stays unaware of its reactions.

## Router composition

Same cascade for **commands**, **queries**, and **HTTP**: unit registers → context composes → root initializes.

```typescript
// <backend-root>/<bounded-context>/agg-<name>/shell/command.router.ts
export const register<ConsistencyUnit>Commands = () => {
  const router = getRouter("commandRouter");
  router.register(ANY_COMMAND_TYPE, anyCommandHandler(command), anyCommandSchema);
};

// <backend-root>/<bounded-context>/command.router.ts
export const register<BoundedContext>Commands = () => {
  register<ConsistencyUnit>Commands();
};

// <backend-root>/command.router.ts
export const initCommandRouter = () => {
  setupRouter("commandRouter", { /* … */ });
  register<BoundedContext>Commands();
};
```

HTTP: unit `shell/http.ts` maps routes onto the Nimbus routers; context `http.ts` composes units; backend-root `http.ts` builds the API Hono app and composes contexts. In combined repos, `src/http.ts` then mounts backend + `src/frontend/http.ts`. Apply middleware at the composition root by default; add it lower only when that scope needs it.

### HTTP URL shape

| Kind    | Shape                                                                | Body / params                                  |
| ------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| Query   | `GET /api/<version>/<bounded-context>/<read-model>/<query-part>`     | Path/search params for id, filters, pagination |
| Command | `POST /api/<version>/<bounded-context>/<consistency-unit>/<command>` | All input in the JSON body                     |

```
GET  /api/v1/iam/users?limit=10&offset=0
GET  /api/v1/iam/users/:id
POST /api/v1/iam/user/register
POST /api/v1/iam/user/change-email
```

## Observers

Register observers in root `eventsourcingdb.ts`. Each observer calls the consistency-unit shell handlers it needs (projection, policy, event-handler, process-manager) directly.

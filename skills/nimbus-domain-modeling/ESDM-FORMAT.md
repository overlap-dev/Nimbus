# ESDM Format

A model starts with a Domain, which is classified by Subdomains and contains Bounded Contexts. Inside a Bounded Context live the consistency units that own behavior: Aggregates, Dynamic Consistency Boundaries, Process Managers, and Read Models.

Consistency units exchange messages. Commands express intent and target a single consistency unit. Events record what happened and are published by exactly one consistency unit. Queries read from a Read Model.

The remaining vocabulary fills in around those primitives. Entities are identity-bearing modeling elements that carry no consistency container of their own – the right shape for things a Dynamic Consistency Boundary refers to. Value Objects are the typed building blocks that appear inside Command and Event payloads. Policies, Event Handlers, and Domain Services are different shapes of behavior that react to Events or sit beside Aggregates. Actors name the ubiquitous-language roles that initiate Commands inside a Bounded Context. External Systems describe what produces or consumes Events from outside the domain. Context Mappings describe the relationship between Bounded Contexts.

One resource per file.

## Structure

Each Bounded Context nests under the Subdomain it belongs to. Inside a context, each consistency unit is a prefixed folder holding its parts in sub-folders; actors and owned edges (`ext-`, `map-`) sit beside the units.

| Prefix    | ESDM kind                    |
| --------- | ---------------------------- |
| `agg-`    | Aggregate                    |
| `dcb-`    | Dynamic Consistency Boundary |
| `pm-`     | Process Manager              |
| `rm-`     | Read Model                   |
| `act-`    | Actor                        |
| `ext-`    | External System              |
| `map-`    | Context Mapping (owned edge) |
| `kernel-` | Context Mapping (shared)     |

The Domain file is `domain.esdm.yaml` — no kind prefix.

Model files live under `model/`, sibling to `schemas/`.

```
docs/domain-model/
├── schemas/
└── model/
    ├── <sub-domain>/
    │   ├── <bounded-context>/
    │   │   ├── agg-<name>/
    │   │   │   ├── agg-<name>.esdm.yaml
    │   │   │   ├── commands/
    │   │   │   │   └── <name>.command.esdm.yaml
    │   │   │   ├── events/
    │   │   │   │   └── <name>.event.esdm.yaml
    │   │   │   ├── entities/
    │   │   │   │   └── <name>.entity.esdm.yaml
    │   │   │   ├── value-objects/
    │   │   │   │   └── <name>.value-object.esdm.yaml
    │   │   │   ├── domain-services/
    │   │   │   │   └── <name>.service.esdm.yaml
    │   │   │   ├── policies/
    │   │   │   │   └── <name>.policy.esdm.yaml
    │   │   │   └── event-handlers/
    │   │   │       └── <name>.event-handler.esdm.yaml
    │   │   ├── dcb-<name>/              # same inner shape as agg-<name>
    │   │   │   └── …
    │   │   ├── pm-<name>/
    │   │   │   ├── pm-<name>.esdm.yaml
    │   │   │   ├── commands/
    │   │   │   │   └── <name>.command.esdm.yaml
    │   │   │   └── events/
    │   │   │       └── <name>.event.esdm.yaml
    │   │   ├── rm-<name>/
    │   │   │   ├── rm-<name>.esdm.yaml
    │   │   │   ├── queries/
    │   │   │   │   └── <name>.query.esdm.yaml
    │   │   │   └── value-objects/
    │   │   │       └── <name>.value-object.esdm.yaml
    │   │   ├── act-<actor>.esdm.yaml    # role in this context's language
    │   │   ├── ext-<system>.esdm.yaml   # BC owns the relationship
    │   │   ├── map-<other>.esdm.yaml    # owned edge (ACL, customer-supplier, …)
    │   │   └── <bounded-context>.esdm.yaml
    │   └── <sub-domain>.esdm.yaml
    ├── shared/
    │   ├── ext-<system>.esdm.yaml       # no single context owns the system
    │   └── kernel-<name>.esdm.yaml      # shared-kernel only
    └── domain.esdm.yaml
```

**Actors:** place `act-<actor>` in the Bounded Context the actor scopes to. An Actor is a ubiquitous-language role of that context, not a person. The same human in another context is a separate actor — do not put actors in `shared/`.

**External systems:** place `ext-<system>` in the Bounded Context that owns the relationship. Use `model/shared/ext-<system>` only when no single context owns the system.

**Context mappings:** place the mapping with whoever owns the translation or contract. When the other party is an External System, `ext-<system>` _is_ the edge — a parallel `map-` file is redundant.

**Policies and event handlers:** A policy lives under the **target** unit (the unit whose command it issues); an event handler lives under the **source** unit (the unit whose event it reacts to).

## Rules

- **Always stick to the ESDM schema.** Definitions are in `docs/domain-model/schemas/core/`.
- **Use `esdm lint -d docs/domain-model/model/`** to surface errors and warnings.
- **Never change the schema definitions** in `docs/domain-model/schemas/`; `esdm update-schema` is the only writer.
- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `avoid`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's domain.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this domain, or a general programming concept? Only the former belongs.

## Definitions

Copied from the official [ESDM concepts](https://www.esdm.io/concepts) on 2026-10-24. The online pages win when they differ; refresh this section when `esdm update-schema` bumps the schema revision.

### Domain

A **Domain** is the top-level area of activity that the model describes. It is the answer to the question what business are we in? – not a single feature, not a product, but the whole field within which the system operates.

A model has exactly one Domain. It sits above Subdomains and everything below them, and serves as the natural boundary: when you ask "is this in scope?", the answer is "yes if it falls under this Domain".

#### When to Use the Term

Use Domain when you want to talk about the whole. A logistics company has a logistics Domain. A bank has a banking Domain. A municipal library has a library Domain. The Domain is the umbrella under which all the other terms make sense.

Resist the temptation to split a Domain into more than one. If you find yourself wanting to, what you're really discovering is that you have multiple Subdomains, not multiple Domains.

### Subdomain

A **Subdomain** is a strategic classification of part of the Domain. It groups Bounded Contexts by their value to the business, so the model captures not only what the system does but also where investment matters.

Every Bounded Context belongs to exactly one Subdomain: the Subdomain is the container that groups the contexts serving the same strategic purpose. A context is filed under its Subdomain from the start, and its strategic classification travels with it.

#### Core, Supporting, and Generic

Domain-Driven Design distinguishes three kinds of Subdomain. **Core** Subdomains carry the strategic value of the business and deserve the most modeling care. **Supporting** Subdomains are necessary but not differentiating – specific enough to build in-house, but not strategic. **Generic** Subdomains are commodity – authentication, payment, geocoding – and are usually solved by a third-party product.

The classification is part of the model, not an aside. Recording it makes the strategic distinction visible to whoever reads the model later, and it shapes how teams reason about investment, ownership, and build-vs-buy decisions.

### Bounded Context

A **Bounded Context** is the largest unit inside which a single, consistent vocabulary applies. The same word can mean different things in different Bounded Contexts; inside a Bounded Context, every term has exactly one meaning.

Bounded Contexts live inside the Domain, each under exactly one Subdomain. They hold the consistency units that actually do the work – Aggregates, Dynamic Consistency Boundaries, Process Managers, and Read Models.

#### Why the Boundary Matters

The boundary is a translation point. When a concept crosses from one Bounded Context to another, you don't carry the meaning along; you re-interpret. A customer in a sales Bounded Context might be a Lead, and the same customer in a billing Bounded Context might be an AccountHolder. Both are real, both are right, and the Bounded Context is what tells you which one you're in.

That is why a Bounded Context is also the place where Context Mappings become meaningful. A Context Mapping describes how two Bounded Contexts translate between each other – which parts of one are exposed, which parts of the other are consumed, and what shape they take in the middle.

#### The Ubiquitous Language

A Bounded Context's most valuable artifact is its **ubiquitous language** – the canonical terms that apply inside it, each with its definition. The language is one entry per term, deliberately without aliases: the whole point of choosing one term is that there is one term. Where helpful, an entry can also list rejected alternatives, so a reader who looks up a synonym still lands on the canonical word.

### Aggregate

An **Aggregate** is the unit of behavior and consistency inside a Bounded Context. It owns a slice of the model that must change together, and it is the only place where a transactional rule about that slice can be enforced.

In ESDM, an Aggregate is the canonical kind of consistency unit: it accepts Commands, applies the rules of the domain, and produces Events that record what happened. Every Event in the model is published by exactly one Aggregate (or by another consistency unit), and every Command targets exactly one.

#### Identity, State, and Invariants

An Aggregate is identified by a single field – its natural key. Every Command and Event referencing the Aggregate carries the same identifier, so the model can trace a fact back to the Aggregate that produced it.

Beyond identity, an Aggregate has state – the data it carries between Commands – and invariants – the rules that must hold over that state. Invariants are the reason Aggregates exist. They are the place where "you cannot withdraw from an empty account" or "a borrowed book cannot be borrowed again before it is returned" lives, and they are checked at the moment a Command is handled.

Authorization is not among these rules. Who may issue a Command is expressed through the Command's permitted Actors (command.actors), not as an invariant: an invariant constrains what the Aggregate's state may become, not who may act on it.

#### When Not to Use an Aggregate

Not every consistency unit is an Aggregate. When the rule that must hold spans multiple Aggregates, a Dynamic Consistency Boundary is the right shape. When the behavior reacts to Events over time without owning state of its own, a Process Manager is the right shape. When the goal is to expose data for queries rather than to enforce a rule, a Read Model is the right shape.

The Aggregate is the workhorse, but it is not the universal hammer. ESDM has all four shapes because each carries a different invariant, and conflating them turns into the kind of model that is hard to reason about a year later.

### Dynamic Consistency Boundary

A Dynamic Consistency Boundary, or DCB, is a consistency unit whose scope is determined at runtime rather than fixed at modeling time. It is the right shape when an invariant has to hold over a set of Entities that varies by Command.

An Aggregate has a fixed boundary: one Aggregate, one identifier, one transactional scope. A DCB is the variant where the boundary is computed from the Command itself. Reserve seats 5, 7, and 9 for tonight's screening, atomically – the seats involved depend on the request, and the consistency that must hold spans only those seats.

#### When a DCB Is the Right Shape

DCBs solve a specific kind of problem: an invariant that crosses entities, but only the entities mentioned in a particular Command. If you find yourself wanting an Aggregate that "owns the world" so it can enforce a rule across many things, a DCB is usually the better answer. The Aggregates stay narrow, and the cross-cutting consistency lives in a unit explicitly designed for it.

The trade-off is that a DCB is a more advanced concept, and not every runtime supports it natively. Modeling a DCB is fine even if the implementation has to fall back to a coarser-grained Aggregate – the model captures the intent, and the runtime catches up.

#### Identity, State, Consults

A DCB is identified by a field that names the set the boundary covers. It declares which Events and Aggregates it consults to enforce the invariant, so the cross-cutting consistency story is internally coherent.

Like an Aggregate, a DCB receives Commands and produces Events. The Events are still single-publisher in the rest of the model; the DCB is just a different shape of publisher.

### Process Manager

A Process Manager is a long-running coordinator. It listens to Events, holds state between them, and emits Commands as a flow progresses through several steps.

Where a Policy is a stateless reaction to a single Event, a Process Manager is what you reach for when the flow needs memory: wait for both Events to arrive, then emit the next Command. Start a timer when this Event happens, and emit a different Command if the timer ticks before another Event arrives.

#### State, Correlation, Lifecycle

A Process Manager has three things every model needs to declare. It has state – the data it tracks across the flow. It has a correlation field – the identifier that ties incoming Events to the right Process Manager instance. And it has a lifecycle: the conditions under which a new instance starts, and the conditions under which an existing instance ends.

All three are explicit, not implicit. Without a starting condition, a Process Manager has no way to come into being. Without an ending condition, it would never finish. Without a correlation field, Events from different flows would land on the same instance.

#### Timers

A Process Manager can also schedule timers. A timer is a future moment at which the Process Manager wants to react – if no confirmation arrives within 24 hours, send a reminder. A timer is a first-class part of the Process Manager's lifecycle: declared with what triggers it, the duration after which it ticks, and the Commands it emits.

#### Where Process Managers Belong

A Process Manager lives inside a Bounded Context, just like an Aggregate does. It is a consistency unit in its own right, although the consistency it enforces is temporal rather than transactional: it ensures the right Commands happen in the right order, not that two pieces of state change atomically.

### Read Model

A Read Model is a view of the domain that is optimized for reading rather than for enforcing rules. It is the answer to what does the world look like right now? – derived from the Events that have been published, shaped to fit the queries it serves.

A Read Model is not an Aggregate. It does not enforce invariants, it does not accept Commands, and it does not own behavior. It owns shape and projection: which Events to listen to, how to fold them, what the resulting structure looks like.

#### Projections and Queries

A Read Model declares two things. Its projections describe the Events it consumes and how those Events update its data. Its queries describe the questions the Read Model can answer for a caller.

A Read Model with no projections has no source of truth and would never have data. A Read Model with no queries is a write-only sink – data goes in, but nothing reads it. Both ends matter: the projections keep the Read Model honest, the queries make it useful.

#### Many Read Models per Aggregate

A single Aggregate can feed any number of Read Models. The customer-list Read Model and the customer-detail Read Model and the customer-by-region Read Model can all consume the same CustomerRegistered and CustomerMoved Events, each shaping them differently for its purpose.

This is one of the ergonomic wins of Event Sourcing. The write side stays focused on invariants, the read side stays focused on queries, and they communicate through the immutable record of Events.

#### Paradigm

A Read Model can be labeled with its paradigm – tabular, document, graph, key-value, time-series, vector, and so on. The label is descriptive rather than enforced, but it is a fact about the Read Model that helps later readers understand what kind of database it expects to live in.

### Command

A Command is the expression of an intent to change the model. It is named in the imperative – BorrowBook, CapturePayment, ReserveSeats – and it targets exactly one consistency unit.

Where an Event records what happened, a Command requests what should happen. The Command can fail: it can be rejected by an invariant, refused by a permission check, or ignored as a duplicate. A rejection comes from an invariant – a rule about the target's state – while a refusal comes from authorization, expressed through the Command's permitted issuers (command.actors), not as an invariant. Only when it succeeds does an Event come into being.

#### Single Target

A Command has exactly one target. Most Commands target an Aggregate; some target a Dynamic Consistency Boundary. The rule that a Command targets a single unit is what keeps the consistency story tractable. A Command that wants to change two Aggregates is not really one Command; it is two, and the model is more honest if you write them that way.

#### Who Issues a Command

A Command is issued by an Actor, an External System, a Policy, or a Process Manager. The model tracks the issuers explicitly: every Command has at least one source.

A Command without an issuer is a Command nobody can send – almost always a modeling mistake.

#### Data and Identity

A Command carries a payload – the data the consistency unit needs to honor the request – and an identifier for the target unit. The payload is whatever the domain requires; the identifier is the same natural key the target uses for its own identity, so the link between Command and target is unambiguous.

Commands do not carry results. The result of a Command is an Event (success) or a rejection (failure); neither is encoded in the Command itself.

### Event

An Event is a fact that something happened. It is named in the past tense – BookBorrowed, PaymentCaptured, OrderShipped – and it carries the data that makes the fact concrete: who, what, when.

Events are immutable. Once published, an Event never changes. It records the state of the world at the moment it was emitted, and any later change is itself an Event. That is the foundation of Event Sourcing: state is not the truth; the sequence of Events is.

#### Publisher and Consumers

Every Event is published by exactly one consistency unit. Most often that publisher is an Aggregate, but it can also be a Process Manager, a Dynamic Consistency Boundary, or another publishing kind. The single-publisher rule is what keeps responsibility traceable: when you ask who emits this Event?, the model gives one answer.

An Event may have any number of consumers – Read Models that project it, Process Managers that react to it, Policies that derive Commands from it. An Event without consumers is almost always a modeling mistake: nobody is listening, and nothing downstream changes when it occurs.

#### Data and Identity

An Event carries a payload – the structured data that describes the fact. It also carries an identifier – the natural key of the consistency unit it belongs to – so that downstream consumers know which entity the fact is about.

Events do not carry intent, decisions, or future tense. OrderShouldShip is not an Event; it is a Command that has not happened yet. OrderShipped is the Event that records the shipment as a fact. Keeping the tense rigorous is one of the simplest disciplines you can apply, and it pays off every time you read the model later.

### Query

A Query is a question a caller asks of a Read Model. It declares the parameters the caller provides, the result the Read Model returns, and which Read Model serves it.

A Query is purely a read operation. It does not change state, it does not produce Events, and it does not have side effects. Get the open invoices for customer X. List the books available in branch B. Show the leaderboard for the current month.

#### Why Queries Are Modeled

You could argue that Queries are an implementation detail – the Read Model is there, just read it. Queries are modeled explicitly because the shape of a Query is part of the contract between consumers and the Read Model. When a Query is written down, the Read Model knows what it has to support, and the caller knows what it can expect.

In practice, this matters most when several callers consume the same Read Model. The Query is the public face; the projections are the implementation. The Read Model can change how it builds its data without changing the Queries, and the callers don't notice.

#### Query and Read Model

Every Query references the Read Model it serves. The link goes both ways: every Query points to a Read Model that exists, and every Read Model that has Queries also has projections to feed them. A Query without a Read Model is a question without a source; a Read Model without Queries is a projection without consumers.

#### Who May Run a Query

Like a Command, a Query records who is allowed to run it: the permitted Actors are listed on the Query (query.actors). This is authorization – in the model it is descriptive: it states who may ask, but it does not enforce the check.

### Entity

An Entity is an identity-bearing modeling element inside a Bounded Context that has no consistency container of its own. It names the what behind an identifier – student, course, book, seat – so the model can talk about the thing that carries the ID, not just the ID itself.

An Entity is not a consistency unit. It does not receive Commands, it does not own state in the sense an Aggregate does, and it does not enforce invariants across a boundary. It is referenced from elsewhere – typically the identifiedBy field of a Dynamic Consistency Boundary, or the payload of a Command – and that is the work the Entity exists to do.

#### When to Reach for an Entity

Reach for an Entity when the model has a thing that needs a name and an identity, but no Aggregate to hold it. The typical case is a model built around a Dynamic Consistency Boundary: a DCB spans a set of identifiers per decision, but it does not own them. Each identifier still refers to a thing in the model – a Student, a Course – and that thing needs a name in the vocabulary. The Entity is that name.

When the same thing has its own lifecycle and invariants over evolving state, model it as an Aggregate instead. An Aggregate already carries identity together with that state, and a separate Entity for the identity alone would only duplicate what the Aggregate provides.

#### What an Entity Is Not

An Entity is not a Value Object: two Entities with the same data are still two different Entities, because identity matters more than data. An Entity is not an Aggregate: it has no state, accepts no Commands, and is not a unit of consistency. An Entity is not an Actor: Actors initiate Commands, Entities are the things Commands and DCBs refer to. An Entity is not a place to put behavior – computations that span several Entities belong on a Domain Service or on the Aggregate or DCB that hosts the decision.

#### Anatomy

An Entity declares a schema describing the shape of a single instance, in the same paradigm-agnostic JSON Schema form a Value Object uses. It declares an identifiedBy strategy that says where the identity comes from – either a field inside the schema (source: schema) or a fixed string when the Entity exists exactly once (source: static). It can declare invariants over the instance shape – checksums, cross-field constraints, format rules – the same way a Value Object can, because both lack a lifecycle. There is no state, no consults, no publishes: an Entity is a description, not a mechanism.

#### Where Identity Comes From

An Entity describes what its identity looks like; it does not mint identifiers. When a new Student appears in the model, the identifier arrives through a Command – issued by an Actor, accepted by an Aggregate or DCB – not by the Entity itself. The Entity is the modeling anchor that lets the Command and the DCB say "this Student" and have everyone in the model know what Student refers to.

### Value Object

A Value Object is a typed, named piece of data that has no identity of its own. Two Value Objects with the same fields are the same Value Object; you don't compare them by reference, you compare them by value.

In ESDM, Value Objects are the building blocks of Command and Event payloads, and of the state inside an Aggregate. A MoneyAmount is a Value Object. A PostalAddress is a Value Object. A Score is a Value Object. They have structure, they have rules, but they do not have independent existence.

#### Why Model Them Explicitly

You can write a Command or an Event payload directly with primitive fields – a string here, a number there – and most models do that for the simplest cases. The reason to lift a structure into a Value Object is the moment you find yourself writing the same shape twice, or the moment a piece of data gains rules of its own.

A MoneyAmount that lives only as currency: string, amount: number is fine until you realize you also need to enforce that amount is non-negative and that currency is a known code. At that point, naming the shape is cheaper than re-stating the rules at every use site. The Value Object is where the rules live.

#### What a Value Object Is Not

A Value Object is not a row in a database. It is not a Read Model. It is not an Aggregate. It is a structural definition that other parts of the model can refer to by name. The same Value Object can appear inside multiple Commands, multiple Events, and inside Aggregate state, and each appearance carries the same meaning.

### Policy

A Policy is a piece of decision logic that reacts to Events and produces Commands. It encodes the whenever this happens, do that rules that hold across the system without belonging to any single Aggregate.

A Policy is stateless. It does not own data, it does not have an identity, and it is not a consistency unit. It listens to Events, applies a rule, and emits Commands. Whatever happens after that is the business of the Aggregates the Commands target.

#### Policy vs. Process Manager

Policies and Process Managers are easy to confuse, because both react to Events and emit Commands. The distinction is state.

A Policy has none. It evaluates a rule against a single Event in isolation: if this Event has this shape, then emit this Command. There is no memory of previous Events, no waiting for a second trigger, no timeout.

A Process Manager has state. It tracks where it is in a longer-running flow, waits for multiple Events, can time out, and produces Commands as the flow progresses. If the rule you're modeling fits in a single sentence about a single Event, it's a Policy. If it needs to remember anything between Events, it's a Process Manager.

#### When to Reach for a Policy

Use a Policy when the rule is global and stateless. Whenever an Order is placed, reserve the inventory. Whenever a returned Book is overdue, charge the late fee. Whenever an Order ships, debit the customer's account.

Use it sparingly. A Policy that grows to several conditions, that needs context from earlier Events, or that needs to defer its decision is a Policy that has outgrown its shape – move it to a Process Manager before it becomes hard to reason about.

### Event Handler

An Event Handler is a piece of behavior that reacts to an Event by causing a side effect outside the model – sending an email, calling an external API, writing to a log, pushing a notification.

An Event Handler is not an Aggregate (it owns no state and produces no Events of its own), and it is not a Policy (it does not derive Commands from Events). It is the integration boundary of the model: the place where the inside of the system meets the outside.

#### Event Handler vs. Policy

The boundary between an Event Handler and a Policy is the kind of effect they cause.

A Policy stays inside the model. It reacts to an Event by emitting a Command, which lands on an Aggregate, which produces another Event. The whole chain is observable in the model.

An Event Handler exits the model. It reacts to an Event by sending an email or calling a service, and the outcome of that effect is not part of the Event sequence. If you need to react to the result of an external call (the email bounced, the service returned an error), you typically wrap the integration in an External System and let it produce its own Events back into the model.

#### Idempotency Matters

Because an Event Handler causes side effects in the world, the question of what happens if the same Event is delivered twice? matters more for handlers than for any other kind. An Event Handler that sends the same email twice is rarely what you want. An Event Handler declares its delivery guarantee – at-least-once or at-most-once – and how duplicates are handled, so the model captures the assumption rather than leaving it implicit in someone's deployment notes.

#### Why Make Handlers Visible

Modeling integrations as Event Handlers makes them visible. When a handler refers to an Event that doesn't exist, the model says so. When an Event has no consumer, the model says so. Integrations are exactly the corner of the system where things rot first; making them visible is the point.

### Domain Service

A Domain Service is a piece of stateless domain logic that doesn't belong to any single Aggregate because it operates over several – or because it has no clear single owner.

When a calculation, a check, or a transformation belongs to the domain (the rules of the business apply) but no single Aggregate is the natural home for it, you reach for a Domain Service. Compute the optimal route from A to B given the current traffic. Decide whether two transactions are likely the same fraud pattern. Check whether an account is permitted to perform this Command.

#### What a Domain Service Is Not

A Domain Service is not infrastructure. Send an email is not a Domain Service; it is an integration concern, modeled as an Event Handler or via an External System.

A Domain Service is also not a stateful coordinator. Wait for these three Events, then emit a Command is a Process Manager, not a Domain Service. The Domain Service is stateless and synchronous: in, compute, out.

#### Why Model One

Modeling a Domain Service explicitly is a way of capturing that this piece of logic exists, and it isn't owned by any Aggregate. Without that statement, the logic tends to scatter – a copy here, a slightly different copy there – and the model loses fidelity.

A Domain Service declares the functions it offers (the operations it performs). A Domain Service with no functions is a Domain Service that does nothing – the kind of thing that drifts in.

### Actor

An Actor is whoever or whatever issues a Command. It can be a human – a customer, an administrator, a clerk – or it can be an automated piece of the system itself.

An Actor is scoped to a Bounded Context. It is a ubiquitous-language role of that context, not a concrete user or account. The same human may exist in several Bounded Contexts and mean different things in each — modeled as a separate actor per context.

Actors are how the model captures agency. Every Command in ESDM has at least one issuer, and every issuer is named, scoped, and typed. That makes the question who can do this? a model-level question rather than a deployment-time one.

#### Human and Non-Human Actors

ESDM distinguishes Actor types. A human Actor represents a real person or a role a real person takes on. A non-human Actor – such as a scheduler, a watchdog, or a system service – represents an automated trigger. The distinction matters because the two come with different concerns: human Actors usually have permissions and interfaces, non-human Actors usually have schedules and runtimes.

A human Actor cannot also be backed by a system component – the model keeps the distinction sharp so a person is never quietly conflated with a process. When a system component issues Commands on behalf of a human, model both: the human as the Actor of intent, the system component as the External System that delivers the Command.

#### Actor and Permissions

Actors are also how the model captures authorization – but the constraint lives on the Command, not on the Actor. A Command that should only be issued by an administrator carries that constraint by listing only the administrative Actor among its permitted issuers (command.actors); the Actor itself holds no permission list. Business-level access policies (roles, scopes, tokens) belong to the runtime; what the model captures is which kinds of Actor are permitted in the first place – a useful baseline that runtime checks then build on.

#### An Actor Is Not an Invariant

An Actor answers who or what issues a Command; an invariant is a rule about a consistency unit's state that must always hold, checked when a Command is handled. The two are easy to conflate, because both can sound like rules – but "only an administrator may cancel an order" is authorization, not an invariant. Authorization is expressed through the Actors a Command permits (command.actors), not as an invariant of the unit. An invariant constrains what the unit's state may become; an Actor constrains who may ask.

### External System

An External System is a system outside the modeled domain that the domain talks to. A payment provider, a mailer, an identity provider, a third-party search service – anything that produces or consumes data on the boundary of what we model.

External Systems give the model a way to be honest about its edges. The world is bigger than the part you're modeling, and pretending otherwise pushes the integrations into footnotes that drift. By naming External Systems explicitly, the model makes its dependencies visible and amenable to the same checks as everything else.

#### Direction

An External System has a direction. It can be inbound (the External System sends Commands or Events into the domain), outbound (the domain sends Commands or Events to the External System), or bidirectional (both).

The direction determines which connections the External System can participate in. An inbound system can be the source of an Event that lands in the domain; an outbound system is what an Event Handler ultimately calls; a bidirectional system does both.

#### External System and Context Mappings

External Systems also appear in Context Mappings – the relationships between Bounded Contexts and the outside world. A customer-supplier mapping where the supplier is an External System is the explicit way to say this Bounded Context depends on a third party for some of its data. Modeling that explicitly turns "we use the payment provider somehow" into a fact the model can check.

### Context Mapping

A Context Mapping describes the relationship between two Bounded Contexts – or between a Bounded Context and an External System. It is the model's record of how these two parts talk to each other.

Context Mappings are a primitive of strategic Domain-Driven Design. The patterns they capture have names – customer-supplier, conformist, anti-corruption-layer, shared-kernel, partnership, separate-ways, open-host-service, published-language – and each pattern describes a different power dynamic, a different kind of translation, and a different set of risks.

#### Why Map Contexts Explicitly

A Bounded Context that depends on another without saying so is a piece of architecture without a name. We use the customer service somehow is a sentence that hides decisions, and the decisions tend to come back as bugs.

When you write down that the relationship is customer-supplier, you commit to a contract direction. When you write down that it is anti-corruption-layer, you commit to a translation point. When you write down that it is separate-ways, you commit to not integrating – and the model holds you to it.

#### Asymmetric and Symmetric

Context Mappings come in two shapes. Asymmetric mappings (customer-supplier, conformist, anti-corruption-layer, open-host-service, published-language) name the two sides distinctly – a customer and a supplier, a conformist and an upstream, a downstream and an upstream. The role names are part of the mapping, so direction is not a comment but a fact.

Symmetric mappings (shared-kernel, partnership, separate-ways) treat the two sides as peers. They name two participating Bounded Contexts. Sharing a kernel or forming a partnership with a third-party External System doesn't fit the model – those mappings live between Bounded Contexts only.

Each mapping represents exactly two endpoints. Richer topologies are expressed as multiple mappings – two customer-supplier arrows, not one three-party document.

---
name: nimbus-domain-modeling
description: >-
  Event sourced domain modeling (ESDM) for Nimbus projects. Use when creating or changing the
  domain model in docs/domain-model (bounded contexts, aggregates, events,
  commands), when sharpening the ubiquitous language, when recording an
  architecture decision (ADR), or when another skill needs the model updated.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design: challenge terms, invent edge-case scenarios, and write the glossary and decisions down the moment they crystallize. This skill changes the model; reading `docs/domain-model/model/` for vocabulary is a one-line habit of every other skill. Implementation follows the model: the `nimbus` skill maps each construct to code.

## File structure

```
/
├── docs/
│   ├── adr/
│   │   ├── 0001-first-architecture-decision.md
│   │   └── 0002-second-architecture-decision.md
│   └── domain-model/
│       ├── schemas/           # created by `esdm add-schema`
│       └── model/
└── src/
```

The `esdm` binary is expected on `PATH` ([install](https://www.esdm.io/getting-started/installing-esdm/)). Bootstrap once per project: run `esdm add-schema` inside `docs/domain-model/` to create `schemas/`; refresh with `esdm update-schema` after a binary update.

Create model files lazily — only when you have something to write. If no `docs/domain-model/model/domain.esdm.yaml` or corresponding sub-domains, bounded-contexts etc. exist, create them when the first domain specification is resolved. If no `docs/adr/0001-first-architecture-decision.md` exists, create it when the first ADR is needed.

## During the session

### Challenge against the ubiquitous language

When the user uses a term that conflicts with the existing language in `docs/domain-model/model/` (each bounded-context defines its own ubiquitous language), call it out immediately. e.g. "The ubiquitous language of the Order bounded context defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update `docs/domain-model/model/` inline

When a term or the domain logic is resolved, update the ESDM files in `docs/domain-model/model/` right there. Don't batch these up — capture them as they happen. Use the format in [ESDM-FORMAT.md](./ESDM-FORMAT.md).

`docs/domain-model/model/` should be totally devoid of implementation details. Do not treat `docs/domain-model/model/` as a spec, a scratch pad, or a repository for implementation decisions. It is for documenting the domain from a business and process perspective. It has to be understood by all stakeholders not only engineers.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:
1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Format and examples of what qualifies: [ADR-FORMAT.md](./ADR-FORMAT.md).

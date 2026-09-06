# ADR 0181: Explore-stage, first hosted machine scope

## Status

Accepted

## Context

The pain point worth determinism first is explore-stage progression: intent advances the stage while readiness does not, and an empty idea list auto-advances deterministically. The proof-of-concept must demonstrate deterministic stage decisions on real rules while staying reviewable and bounded, leaving presentation and review-loop policy caller-side.

## Decision

Host `explore-stage@1` as the first machine with a deliberately narrow scope:

- The machine absorbs only the stage-progression transition table: it advances on explicit intent signals plus deterministic empty-list auto-advance, never on model readiness judgment.
- Projection is pure with no I/O and no rendering.
- The caller keeps panel ownership and marking hooks, the Result Loop, Closure State ownership and intent classification.

## Alternatives Considered

- **Host a different machine first (for example lifecycle only)** — rejected: would prove transport without proving deterministic stage decisions, the core motivation.
- **Absorb the Result Loop, Closure State ownership and intent classifiers into the machine** — rejected: explicitly out of proof-of-concept scope; moving presentation and review into the service would couple the machine to panel rendering and review-loop policy that must stay caller-side.

## Consequences

- The platform is proven on real stage rules rather than on transport alone.
- The proof-of-concept stays bounded to one registered machine; the registry proves extensibility without adding more here.
- Later machines reuse the envelope, transport and discovery unchanged.

## Related

- Change `state-machine-sidecar` — `design.md` D7, Goals and Non-Goals (E8 scope exclusion)
- ADR 0178 — the registry and envelope this machine is hosted on
- ADR 0179 — the pointer-only projection rule this machine obeys

# ADR 0152: Build is an ordinary composition coordinator, not explore supervision

<!-- adr-index: refs 0147; refs 0151; refs 0083 -->

## Status

Accepted

## Context

`/sai-build` must run implement then apply in one supervising invocation. Explore already chains phases, but its chain exists to serve a conversation-held crystallized block and Auto authorization. Build's input is an OpenSpec change name resolved from disk via the change-picker. Reusing explore supervision would couple unrelated concerns and invent a second composition style for ordinary disk-backed work.

## Decision

Ship `/sai-build` as a normal routed composition card under the existing `orchestration-core` chained phase composition contract. The build coordinator declares two phase adapters (implement at 0, apply at 1), resolves the change once from disk-backed picker/envelope inputs, and never uses explore's supervision pattern, conversation-held crystallized blocks, or Auto authorization.

## Alternatives Considered

- **Explore-style supervised chain with conversation-held state** — rejected; build's input is on-disk change identity, not a crystallized conversation block.
- **Ordinary composition coordinator with disk-backed change name** (chosen) — reuses the composition primitive without coupling to explore semantics.

## Consequences

- Build is a composition consumer, not a second composition primitive.
- Design readiness and artifact preflight stay inside implement; build invents no design-approval gate.
- Explore retains its supervision-specific chain until a later unification (deferred).

## Provenance

User — `openspec/changes/sai-build-command/design.md`, Decision D1.

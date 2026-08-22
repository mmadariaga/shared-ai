# ADR 0137a: The stage-advancement token is the literal next-step

## Status

Accepted

## Context

The staged pre-crystallization progression (`explore-pre-crystallization-stages`) advances only on explicit user intent. The proposal pinned the shorter candidate literal `next` in the specs and mandated a design-phase token-literal confirmation; candidates ranged from the terse `next` to the verbose `continue-exploration`. Once users form the habit and the specs pin the firing condition, changing the literal requires a spec amendment and re-teaching users, and a future reader will ask why this literal rather than a shorter or longer one.

## Decision

The stage-advancement token is the literal `next-step`, recognized by the existing bare-token/dominant-intent machinery of the `review-loop` token: it fires only as a bare token (optionally with trivial punctuation or a greeting) or when advancing the stage progression is the turn's dominant intent; mere containment, negation, deferral, quotation, or discussion of the string never fires it. Clear natural-language stage intent also advances the progression. The firing condition and the two token scenarios of `specs/explore-pre-crystallization-stages/spec.md` were amended in place and recorded in the change's approval metadata.

## Alternatives Considered

- `next` — shortest; rejected as too terse and un-self-descriptive for the stage-advancement action.
- `continue-exploration` — most explicit; rejected as unnecessarily long.

## Consequences

`next-step` is self-descriptive for the stage-advancement action, collides with no existing token (`crystallize`, `review-loop`, `start-pipeline`) and with no instruction prose, and reuses the `review-loop` recognition rule verbatim. The literal is now pinned in the explore specs and taught to users; a future change requires a spec amendment plus re-teaching.

## Provenance

User — confirmed with the user during the design phase at the proposal-mandated token-literal confirmation; the specs were amended in place accordingly.

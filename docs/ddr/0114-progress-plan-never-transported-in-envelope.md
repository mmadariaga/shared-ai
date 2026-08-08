# DDR 0114: The dispatch envelope is exactly two strings; progress-plan content never travels in it

## Status

Accepted

## Context

The dispatch envelope is closed at exactly two strings (`wrapper_echo_value`, `arguments_value`) per the design worker contract (`sai/orchestration/workers/sai-2-design-worker.md:7-10`), and no requirement widens it. User review of the change's prose (GLOSSARY.md:91, "transported through dispatch", and reconstruction phrasing) read as if the progress plan travels through the dispatch channel — a contradiction with the closed envelope.

## Decision

The dispatch envelope remains exactly two strings. The progress plan is declared inline by the phase adapter — which lives in the coordinator's own source (`sai/commands/design/coordinator.md`) — held in the coordinator's invocation-scoped state, and never carried in the envelope, in reconstruction fields, or in any worker-directed payload. The worker learns step ids exclusively from its own phase contract enumeration. Because the ids are canonical in the phase contracts, no plan reconstruction field exists and a replacement worker enumerates the same ids from its own phase contract.

## Alternatives Considered

- **Widen the envelope to carry the plan** — rejected: breaks the closed two-string envelope invariant, forces a plan reconstruction field, and is unnecessary because ids are canonical in the phase contracts.
- **Leave the transport wording uncorrected** — rejected: a mute prose-vs-invariant contradiction gets "resolved" arbitrarily by later implementers; the glossary wording is corrected by the reconciliation step.

## Consequences

The closed envelope is load-bearing across all seven workers; widening it later touches every worker contract, binding, and the reconstruction contract. The decision states a constraint the domain imposes on the pipeline's records that must hold at all times, which is why this record is a DDR.

## Provenance

User — the decision and its alternatives were settled in the design discussion recorded in `design.md` D7.

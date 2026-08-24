# ADR 0172c: Step-gated instruction delivery hands each spec step its instructions just-in-time

<!-- adr-index: refs ddr:0114; refs ddr:0109c; refs ddr:0110 -->

## Status

Accepted

## Context

The sai-1-spec worker received its entire instruction mass at dispatch — lifecycle contract, quality layer, skills, and policies, roughly 15–25k tokens before the first step executed. On small models, salience decays over such a run and produces adherence drift: scope violations, forgotten formats, malformed payloads. The canonical six-step progress plan already pauses the worker at every step boundary through the additive nonterminal progress event, so the delivery gates exist without adding any new lifecycle state.

Delivery could be gated either by the worker (fetching step files itself) or by the coordinator (naming the active step in the continuation payload). Worker-side gating cannot guarantee sequencing: an eager model prefetches everything it sees referenced, and cherry-picking defeats the point. Only the coordinator's continuation payload is under deterministic control, and the coordinator already renders marks before resuming, so it knows exactly which step is next.

## Decision

1. When a phase adapter declares the optional static `step_pointer_map`, every progress-event continuation payload carries exactly two lines: today's protocol continuation line, then one pointer line `Active step: <id> — follow <path>` derived deterministically — apply the event's marks and take the first declared step still unmarked in plan order; with every declared step marked, the second line reads exactly `Active step: none — complete remaining work and return your terminal result.`
2. The worker executes only the step file named by the most recent pointer line and never prefetches any other step file. Step paths exist solely as coordinator continuation lines; the worker contract plus one always-loaded `common.md` form the sealed initial surface. `prereqs-and-change` has no step file and runs from that surface before the first pointer.
3. The field follows the established declared-static pattern (`progress_plan`, `recovery_policy`): fully known at dispatch, immutable for the active adapter segment, never transported in the dispatch envelope or reconstruction fields. An adapter without the map keeps today's exact-literal continuation, leaving every other phase observationally identical. Materialized binding literals are untouched; replacement reconstruction additionally carries the departing worker's `active_step_id`.
4. Feedback and recovery continuations carry no pointer line: the active step file persists in the same worker's continuous session.
5. Experiment scope is sai-1-spec only.

## Alternatives Considered

- **Worker-side lazy fetch** — the worker derives and fetches its next step file — rejected: prefetch and cherry-picking are nondeterministic, the marked set is coordinator-owned so the worker cannot derive order reliably, and referencing all step paths up front destroys the sealed surface.
- **Fresh worker per step with disk-based handoff** — rejected for this experiment: it rewrites journal ownership, replacement reconstruction, and feedback-iteration semantics; revisit only if salience gains prove insufficient.
- **Status quo (load everything at dispatch)** — rejected: this is the drift the change exists to remove.

## Consequences

- Total context tokens are unchanged — same-worker continuation still accumulates history; the gain is recency and salience of the active rule set, not context size.
- Critical prohibitions are deliberately duplicated across the worker contract and step files; deduplication is not cleanup (see DDR 0156).
- Rollback is removing the `step_pointer_map` declaration from the spec coordinator card: the runner falls back to exact-literal continuations and the step files simply stop being delivered.
- Graduating the mechanism to another phase requires that phase's own map and carved step files; nothing else changes until then.

## Related

- `openspec/changes/spec-step-gated-instructions/design.md` — D1/D2 provenance
- `docs/ddr/0156a-critical-prohibitions-duplicated-across-spec-steps.md` — the duplication invariant this delivery relies on
- `docs/ddr/0109c-declared-canonical-immutable-progress-plan.md` — the declared plan the derivation reads
- `docs/ddr/0110-additive-nonterminal-progress-event.md` — the pause/resume carrier the pointer rides
- `docs/ddr/0114-progress-plan-never-transported-in-envelope.md` — the pointer likewise stays out of the envelope

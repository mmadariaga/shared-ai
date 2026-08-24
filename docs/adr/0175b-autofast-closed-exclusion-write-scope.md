# ADR 0175: The auto-fast implementer's writable surface is a closed exclusion list, not a defined "production code" term

<!-- adr-index: refs 0172d -->

## Status

Accepted

## Context

The auto-fast implementer worker's contract defined its writable surface through the positive umbrella term "production code only". Commodity-model workers executing that clause resolved the undefined term inconsistently against repository contents. This repository is a prompt library whose product is markdown command cards and policy files: in a real auto-fast run, the term resolved against that actual product and the worker refused a legitimate change, then improvised a pre-dispatch veto that no clause defines. Undefined normative vocabulary under delegated autonomous execution produces inconsistent refusals and unowned implementation targeting; the same silence left tests and implementation targeting unowned.

## Decision

Replace the "production code" vocabulary with an explicit permission/exclusion model:

- State permissions positively and closedly: code, tests, and the project configuration the change requires are writable.
- Ban by named exclusions only, each naming its concrete hazard: writes under `openspec/`, planning-artifact creation by exact name (`design.md`, `tasks.md`, `implementation.md`), mutating git commands, and subagent dispatch.
- Define the out-of-scope-block outcome as a coordinator-side documented pre-dispatch refusal in explore's Auto (fast implementation) flow — judged from the emitted block only, naming the violated clause and block evidence — rather than a worker `failed` result or an improvised veto.
- Never reintroduce an undefined positive umbrella term for the writable surface.

## Alternatives Considered

- **Define "production code" precisely instead of removing it** — rejected: any umbrella term stays ambiguous to commodity-model readers across repository types, which is exactly the failure observed; enumerating permissions and exclusions removes the interpretation step entirely.
- **Worker-side `failed` result for out-of-scope blocks** — rejected: post-dispatch failure wastes a dispatch round and routes through Bounded Recovery, whose diagnosis budget exists for unexpected faults, not for statically decidable block incompatibility; the pre-dispatch judgment reads one block and dispatches nothing.
- **Leave the veto improvised** — rejected: an undefined veto with no owning clause produced the original incident's unaccountable refusal and left no retryable, documented outcome.

## Consequences

- Closed exclusions permit more by default: root-level documentation becomes writable when an emitted block requires it — an accepted trade-off backed by each ban naming its concrete hazard.
- The pre-dispatch compatibility judgment reads only the crystallized block, so necessity grounded outside the block is invisible to it; Manual selection remains the escape hatch.
- Bounded Recovery stays post-dispatch-only and never substitutes for the pre-dispatch refusal.
- Read-only audit phases carry their own separate "production code" clauses; those clauses are unaffected by this decision and may need their own follow-up if the same ambiguity surfaces there.
- The hands worker's owned-staging wording follows the implementer's listed changed paths rather than "production-code paths".

## Related

- Change `autofast-clause-repair` — proposal and delta specs (`auto-fast-implement-worker`, `auto-fast-hands-worker`, `explore-pipeline-supervision`, `explore-implementation-details`)
- ADR 0172d — Sibling worker dispatch for the fast lane (the dispatch structure this decision's pre-dispatch gate sits in front of)

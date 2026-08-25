# DDR 0160: A phase reachable by more than one dispatcher validates at the worker

<!-- ddr-index: refs adr:0048, refs ddr:0158 -->

## Status

Accepted

## Context

`sai-2-design` is reached by two dispatchers: the routed design coordinator, and Explore's supervised pipeline, which dispatches the design worker directly with no coordinator in the run at all.

The phase's contracts did not reflect that. ADR 0048 placed the `--fast-track` parse in each command's body file, back when `sai/commands/sai-2-design.md` existed and per-harness wrappers were the only entrypoint; that decision migrated into "coordinator-owned" wording when body files became coordinators. The supervised route did not exist when it was decided. The result was two spec requirements — `Fast-track activation is coordinator-owned handoff` and `Overview-language form validation is coordinator-owned fail-fast` — asserting that a surface which is absent on one route performs work that route still needs done.

The implementation had already diverged silently: the worker parsed fast-track, returned the banner notice, and kept a banner-dedup reconstruction field, all of which the first requirement forbids. Nothing detected the divergence, because no test compares a spec against the implementation it describes.

## Decision

1. When a phase is reachable by more than one dispatcher, any obligation the phase cannot complete without — argument stripping, form validation — belongs to the **worker**, because the worker is the only surface common to every route. A coordinator may still fail fast ahead of it, but it can never be the sole owner.
2. Presentation obligations resolve the other way. A banner, a picker, or any user-facing emission belongs to whichever surface is actually supervising the run, so the worker suppresses its own emission when a supervising composition owns it. The invariant to preserve is the observable one — exactly one activation confirmation per invocation — not the identity of its emitter.
3. A requirement SHALL NOT name a surface that is absent on one of the phase's routes as the owner of work that route performs.

## Alternatives Considered

- **Give the supervised route a coordinator.** Rejected: Explore is read-only by contract and would become a second design coordinator, duplicating the lifecycle it dispatches into.
- **Keep coordinator-owned validation and let the supervised route pass malformed input through.** Rejected: it makes a flag-bearing token reachable as a resolved change name, which is the defect this repair exists to close.
- **Duplicate the parse into every dispatcher.** Rejected as the drift ADR 0048 already rejected, now with more dispatchers to keep in sync.

## Consequences

- The two `design-planning-worker` requirements are rewritten to describe route-dependent ownership; ADR 0048 stays as the record of why the original placement was chosen, since specs describe current state and decision records hold history.
- The rule generalizes: any future phase gaining a second dispatcher inherits it without re-deriving the reasoning.
- It does not resolve the broader gap this repair exposed. Spec-to-implementation conformance is unverified across the spec corpus, and the tests that read specs assert vocabulary presence and prose ordering rather than conformance, so a spec can describe a system that no longer exists while its suite stays green.

**Complexity**: high (7 modified capabilities; S5 paths > 8; no breaking change; no new dependency)

## Why

Under selector-dispatched Auto supervision, the spec and design workers still dispatch their own isolated reviewer subagents even though explore's in-session Review Engine already holds repository context and performs supervised rounds. That accepted duplication costs up to 6 reviewer dispatches per phase (twice per full supervised run) on top of explore's own rounds. The archived `2026-08-15-supervised-in-situ-review` moved the supervised layer in-session for exactly this reason but left the worker-owned loop untouched; this change closes that gap for the supervised path only.

## What Changes

- Spec and design workers honor a new `--supervised` flag on the selected envelope source: when present, the automatic worker-owned planning-artifact review loop is suppressed (no isolated reviewer dispatch); when absent, standalone `/sai-1-spec` and `/sai-2-design` behavior is byte-for-byte unchanged.
- The marker rides as flag content inside the two-string envelope on the source that remains selected after wrapper-echo precedence; it is not introduced solely as a bare `wrapper_echo_value` that would discard the crystallized request. Boot adapters are untouched.
- Two phase grammars, one token: the spec worker gains a minimal leading recognized-flag grammar (leading flags consumed; first non-flag line opens the verbatim request); the design worker recognizes `--supervised` on its existing name-first flag surface alongside `--fast-track` / `--overview-lang` (canonical Auto shape `{name} --fast-track --supervised`). Reviewer reference sets use the flag-stripped request.
- Explore item 10's Auto dispatch envelopes forward `--supervised` into both the spec dispatch (leading, ahead of the Ready to Propose body) and the chained design dispatch (name-first with existing flags), including the design-phase retry branch.
- Explore's per-phase in-session supervised round cap rises from 1 to 3, matching the arithmetic already stated in `planning-artifact-review-loop` coexistence and the GLOSSARY **Supervised Review Round** definition, and resolving the standing divergence that justified the one-round wording by the worker-owned loop having already done heavy convergence.
- `planning-artifact-review-loop` coexistence stops declaring worker-owned + supervised duplication an accepted trade-off under supervision; automatic-loop caps govern only the non-suppressed automatic loop; user-requested additional passes remain uncapped and unconditioned by the marker.
- `sai/policies/artifact-review-contract.md` surface enumeration is reworded so the worker-owned loop is conditional rather than unconditional; severity vocabulary, finding shape, identifier scheme, and tally form stay unchanged.
- Declared progress plans of both workers are left untouched; under supervision the `review` step simply goes unmarked (no substitute evidence, no plan amendment).

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `planning-artifact-review-loop`: automatic worker-owned review becomes conditional on absence of the supervision marker; caps govern only the non-suppressed automatic loop; coexistence stops declaring accepted duplication under supervision; user-requested additional passes stay uncapped and unconditioned; shared-contract surface enumeration becomes conditional.
- `supervised-pipeline-forwarding`: normative home for forwarding `--supervised` into both the spec dispatch and the chained design dispatch (including design-phase retry), in exact parallel with `--overview-lang` / `--fast-track`.
- `supervised-review-rounds`: per-phase in-session round cap reconciled from 1 to 3; stop/exhaustion semantics scaled to the three-round bound; justification no longer relies on a co-running worker-owned convergence loop.
- `explore-pipeline-supervision`: item 10's two dispatch envelopes (spec and chained design) and the design-phase retry branch carry the `--supervised` marker; in-session round wording raised to the three-round cap.
- `pipeline-design-phase-chaining`: design-loop one-round restatements and High-closes-bound-immediately wording updated to the three-round bound and High-extends-while-cap-permits rule; counting remains delegated to `supervised-review-rounds`; deferred user-gate wording follows three-round exhaustion.
- `supervised-review-reporting`: cap-exhaustion one-line report trigger reworded from the one-round cap to the three-round cap; report shape, non-failure classification, and no-outstanding-High claim unchanged.
- `artifact-feedback-gate`: sai-1 deferred user-gate trigger reworded from the one-round cap to the three-round cap; gate ownership, option labels, iteration counter, and worker-failure-interruption branch untouched.

## Impact

- `sai/commands/spec/worker.md` — envelope/flag-prefix parsing; condition `### Worker-owned planning-artifact review` on marker absence; strip `--supervised` before building the reviewer reference set.
- `sai/commands/design/worker.md` — recognize `--supervised` alongside existing `--fast-track` / `--overview-lang`; condition the equivalent review section on marker absence.
- `sai/commands/explore/instructions.md` — item 10: add `--supervised` to spec and design dispatch envelopes (including design-phase retry); raise one-round wording to three rounds; drop the "worker-owned loop already did heavy convergence" justification; update the `review_rounds` state contract so per-phase counters reset to zero at the start of each new Auto attempt and rounds from an earlier failed/cancelled attempt do not count against the new three-round bound.
- `openspec/specs/planning-artifact-review-loop/spec.md` — automatic-loop-caps scope, coexistence rewrite, shared-contract enumeration conditional wording, user-requested-additional-passes remains unconditioned.
- `openspec/specs/supervised-pipeline-forwarding/spec.md` — add `--supervised` forwarding requirements parallel to `--overview-lang`.
- `openspec/specs/supervised-review-rounds/spec.md` — rename/replace one-round-cap requirement with three-round cap; update scenarios and exhaustion wording.
- `openspec/specs/explore-pipeline-supervision/spec.md` — dispatch-envelope and retry requirements carry the marker.
- `openspec/specs/pipeline-design-phase-chaining/spec.md` — design-loop cap and High-stop wording aligned to three rounds; deferred gate after three-round exhaustion.
- `openspec/specs/supervised-review-reporting/spec.md` — one-line cap-exhaustion trigger aligned to three-round exhaustion.
- `openspec/specs/artifact-feedback-gate/spec.md` — sai-1 deferred user-gate exhaustion trigger aligned to three-round cap.
- `sai/policies/artifact-feedback-gate.md` — same deferred-gate trigger sentence only (`exhausts its one-round cap` → three-round cap); ownership, labels, counter, and interruption branch untouched.
- `sai/policies/artifact-review-contract.md` — line-3 surface enumeration only (conditional automatic worker-owned loop).
- Contract tests: update `test/explore-pipeline-selector.test.js` (item-10 supervised round/cap and worker-owned Phase Review Pass wording) and `test/spec-coordinator-worker.test.js` where it pins unconditional worker-owned review; at design/implementation, grep `test/**/*.js` for remaining `one-round` / `at most one review round` / `heavy convergence` pins and update any hits so the set stays closed.
- Not touched: boot adapters; two-string envelope shape; manual post-crystallization review loop (item 9 / `review-loop-navigation`); finding severity vocabulary/shape/identifier/tally; declared progress plan step lists; standalone path when marker absent.
- Coordination: `openspec/changes/enforce-review-loop-navigation` is in flight over the manual loop — adjacent surface, low collision risk.

## Proposal Research Documentation

**Local files**: sai/commands/spec/worker.md:8,38-52; sai/commands/design/worker.md:8-27,72-84; sai/commands/explore/instructions.md (item 10 dispatch envelopes, in-session round wording ~305+, chained design ~335-346, design retry); sai/policies/artifact-review-contract.md:3; openspec/specs/planning-artifact-review-loop/spec.md (automatic-loop-caps, user-requested-additional-passes, reviewer-isolation-and-read-only-input, coexistence-with-existing-review-surfaces, the-shared-contract-enumerates-this-surface); openspec/specs/supervised-pipeline-forwarding/spec.md; openspec/specs/supervised-review-rounds/spec.md (one-round-cap-per-phase and related); openspec/specs/explore-pipeline-supervision/spec.md; GLOSSARY.md (Artifact Review, Phase Review Pass, Supervised Review Round); openspec/changes/archive/2026-08-15-supervised-in-situ-review/proposal.md; openspec/changes/enforce-review-loop-navigation (adjacent in-flight)

**External URLs**: None

## Additional Notes

- **Suppression is automatic-loop only.** When the marker is present and the automatic loop is suppressed, an explicit user request for another review pass at the prose feedback gate still runs (uncapped, same isolation and contract).
- **No dispatcher provenance check.** A `--supervised` marker on any invocation is honored as written; the worker does not verify that explore's Auto selector dispatched it (E4).
- **Reference-set hygiene (E5).** Reviewers never see the `--supervised` line; the reference set is the stripped request.
- **Prefix grammar (E7).** Spec worker consumes only leading lines that are recognized flags; the first non-flag line opens the verbatim request and nothing after it is parsed as a flag.
- **Failed/cancelled mid in-session round (E6).** With the worker-owned layer gone under supervision, a failed or cancelled worker during an in-session round stops the run under that terminal; no reviewer-retry safety net absorbs it.
- **Progress plan (E3 / I9).** The `review` step remains in each worker's declared plan and simply goes unmarked under supervision; no substitute evidence marks it.
- **Design-phase retry (E1 / I3).** Retry uses `arguments_value: "{name} --fast-track --supervised"` plus `--overview-lang {overview_language}` when applicable — same marker as the normal chained dispatch.
- **Trade-off accepted.** Reviewer independence from the coordinator's own auto-answers is given up on the supervised path; per-round disk reread and the autonomy audit log remain the guards against rubber-stamping.
- **Alternatives rejected (record only):** marker in `wrapper_echo_value` (echo precedence discards crystallized block); third envelope field (breaks two-string boot contract); separate supervised worker bindings (duplicates surface for one boolean); invert default so loop activates only on explicit standalone flag (silence becomes the signal); remove worker-owned loop entirely (standalone would have no automatic review).

**Complexity**: high (17 capability entries — 3 new, 11 modified, 3 retired; no breaking change; no new dependency)

## Why

The isolated reviewer is specified as an ad-hoc subagent with no agent binding (`openspec/specs/pipeline-independent-review/spec.md:11`), so nothing prevents it from exploring the repository to orient itself — it pays that cost and still lacks the conversation. Auto mode should do what the user does by hand between two chats: review with full context, hand findings to the worker, and stop.

## What Changes

- In `start-pipeline`, the explore coordinator performs each review round itself through the extracted **Review Engine** — the shared review-work piece both modes use — instead of dispatching a fresh isolated reviewer subagent per round. No reviewer subagent is raised for any round, and the auto path never presents the five-option picker: the coordinator picks the artifact set by phase (sai-1 for spec rounds, sai-2 for design rounds).
- The per-phase three-round cap, per-phase round counters, stop-when-no-High, autonomy audit log, and worker question escalation stay in auto mode.
- Cap exhaustion stops being a run-stopping ending: it is reported as one line carrying the last round's finding counts and the run continues — a cap-exhausted spec phase now chains design (previously it did not dispatch design).
- Removed from auto mode: fresh reviewer per round, the no-recognizing-previous-round rule, the `reviewer failed` / `reviewer cancelled` / `severity out of contract` results, per-round report blocks, findings history, the unvalidated-changes flag, and the loose list of outstanding High findings.
- The idea-list panel marks "in progress" the review item during auto review rounds, the same way the manual review loop already does; the line stating the supervised pipeline never sets the in-progress state goes away.
- The manual review loop is unchanged by this slice (its navigation shell and its engine invocation keep working exactly as today). The machine-feedback path that carries findings into the phase worker is untouched in mechanism (same-worker continuation, per-item legitimacy, worker-owned edits); only its dead reviewer-interruption wording is removed.
- The isolated-reviewer capability is retired because its central requirement — the reviewer never receives the conversation — ceases to exist when the coordinator reviews in-session.

## Capabilities

### New Capabilities
- `supervised-review-in-session`: the explore coordinator performs each supervised review round itself through the extracted engine, per phase, with no reviewer subagent and no artifact-set picker.
- `supervised-review-rounds`: the per-phase three-round cap (separate counters per phase), stop when a round reports no High, apply the last round's findings before continuing either way, and the mid-cycle worker-failure rule.
- `supervised-review-reporting`: cap exhaustion is reported as one line carrying the last round's finding counts, then the run continues; per-round blocks, findings history, the unvalidated-changes flag, and the loose High list are removed.

### Modified Capabilities
- `review-engine-extraction`: the engine gains its second caller — the supervised pipeline invokes it per round with the change name and the phase's artifact-set designator.
- `artifact-feedback-gate`: the machine-feedback adapter requirement is reworded from review passes to review rounds; the deferred-gate clause loses the impossible `review_failed`/`review_cancelled` interruption.
- `pipeline-review-severity`: the severity-contract-violation-handling requirement is removed (no reviewer output to validate); the closed vocabulary, stop condition, shared criteria, and vocabulary scope survive in round terms.
- `pipeline-phase-transition`: design chaining now occurs on spec-phase convergence or spec cap exhaustion; reviewer-failure/cancellation/severity-violation scenarios removed; report wording passes→rounds.
- `pipeline-design-phase-chaining`: chaining condition updated; the design review loop becomes in-session engine rounds; reviewer-failure clauses removed; the design machine-feedback adapter and deferred user gate survive.
- `explore-pipeline-supervision`: cap exhaustion chains design instead of stopping the run; reviewer-result clauses removed; worker-failure preservation keeps applied fixes without findings history or the unvalidated flag.
- `explore-pipeline-token`: the active-supervision interval wording follows the new transition condition and in-session rounds.
- `explore-idea-list`: the supervised pipeline now sets and resolves the review-item in-progress state during its rounds; the `SHALL NOT set or resolve` clause is removed.
- `explore-review-evidence-marking`: failed/cancelled phase worker replaces failed/cancelled pipeline reviewer; pass→round wording for the supervised path.
- `pipeline-autonomy-audit-log`: reviewer failure removed from the terminal-outcome list.
- `planning-artifact-review-loop`: the coexistence clause references the new in-session rounds; the worst-case dispatch math drops the supervised layer's reviewer dispatches.

### Retired Capabilities
- `pipeline-independent-review`: retired — the isolated reviewer's central requirement (reviewer never receives the conversation) ceases to exist.
- `pipeline-convergence-loop`: retired — the fresh-reviewer repetition machinery is replaced by in-session rounds.
- `pipeline-iteration-bound`: retired — the three-pass bound and cap-exhaustion terminal re-home into the per-phase three-round cap and the one-line continuation report.

## Impact

- `sai/commands/explore/instructions.md` — item 10 rewritten: the spec-phase convergence loop (`:294-334`) and the design-phase loop (`:368-372`) become in-session engine rounds; the deterministic per-pass reporting blocks are removed; cap exhaustion becomes a one-line report that continues to design; the phase-transition and design-chaining wording moves from passes to rounds; the `:221` in-progress sentence ("The supervised pipeline (item 10) never sets or resolves it.") is removed; the state contract drops `finding_history` and the unvalidated-edit flag while keeping per-phase round counters.
- `sai/policies/artifact-feedback-gate.md` — the `MachineFeedbackAdapter` section is reworded pass→round and loses the `review_failed`/`review_cancelled` interruption clause; its per-item processing semantics are unchanged (the mechanism is not touched).
- `sai/policies/artifact-review-contract.md` — at implementation, its surface enumeration (line 3) replaces "the supervised pipeline's independent spec- and design-artifact reviewers" with the in-session supervised review rounds, and its severity-contract rejection evidence and pipeline `Contract-violations` composition clauses become inert for the supervised flow (no reviewer output exists to reject); the base-form tally, finding shape, and identifier scheme are unchanged. The policy is outside spec-phase write scope.
- `GLOSSARY.md` — new term **Supervised Review Round**; flagged ambiguity **Supervised Review Round vs Phase Review Pass**; **Supervised Pipeline** definition updated to name the in-session review.
- `test/explore-pipeline-supervision.test.js` — assertions updated: `finding_history` removal, cap-exhaustion-now-chains-design, reviewer-failure clauses removed, pass→round wording, policy wording.
- `openspec/specs/pipeline-independent-review/spec.md`, `openspec/specs/pipeline-convergence-loop/spec.md`, `openspec/specs/pipeline-iteration-bound/spec.md` — deleted at implementation (retired).
- `openspec/specs/supervised-review-in-session/spec.md`, `openspec/specs/supervised-review-rounds/spec.md`, `openspec/specs/supervised-review-reporting/spec.md` — new capability specs.
- Eleven modified capability delta specs (listed under Capabilities).
- Not touched: the manual review loop (`review-loop-navigation`, the engine's manual invocation), the worker-owned planning-artifact review loop, question autonomy/escalation, `supervised-pipeline-forwarding`, `review-finding-format`.

## Proposal Research Documentation

**Local files**: sai/commands/explore/instructions.md:221,294-334,336-372; openspec/specs/pipeline-independent-review/spec.md; openspec/specs/pipeline-convergence-loop/spec.md; openspec/specs/pipeline-iteration-bound/spec.md; openspec/specs/pipeline-review-severity/spec.md; openspec/specs/pipeline-phase-transition/spec.md; openspec/specs/pipeline-design-phase-chaining/spec.md; openspec/specs/explore-pipeline-supervision/spec.md; openspec/specs/explore-pipeline-token/spec.md; openspec/specs/explore-idea-list/spec.md; openspec/specs/explore-review-evidence-marking/spec.md; openspec/specs/pipeline-autonomy-audit-log/spec.md; openspec/specs/planning-artifact-review-loop/spec.md; openspec/specs/artifact-feedback-gate/spec.md; openspec/specs/review-engine-extraction/spec.md; sai/policies/artifact-feedback-gate.md; sai/policies/artifact-review-contract.md; GLOSSARY.md; openspec/changes/archive/2026-08-14-extract-review-engine/proposal.md; openspec/changes/archive/2026-08-14-extract-review-engine/specs/*; test/explore-pipeline-supervision.test.js

**External URLs**: None

## Additional Notes

- **Overview language: Español** — the change overview will be generated in Spanish; pass `--overview-lang Español` when invoking `/sai-2-design` on this change.
- **Dependency.** This change is the follow-up slice to `extract-review-engine` (archived 2026-08-14): the Review Engine extracted there is the shared review-work piece this change wires the supervised pipeline to as its second caller (the archived proposal's "Caller seam" note). No engine behavior is redefined here.
- **Slice boundary.** The manual review-loop is explicitly unchanged by this slice: the five-option picker, `Skip`/`Exit review loop`, the picker re-entry invariant, the print-for-paste handoff, and the language-gate reuse all stay with `review-loop-navigation`; only the supervised pipeline's review work moves in-session.
- **What the review looks for does not change.** The engine's evaluation axes, the `High`/`Medium`/`Low` severity vocabulary, the finding shape, and the base-form tally are all untouched; only who performs the review (the coordinator, in-session, per round) and how its outcome is reported change.
- **Cap exhaustion is not a failure.** The last round's findings are applied and nobody re-reads afterwards, so the run reports the last round's counts and continues without asserting that High findings remain in the current state — that claim would be unverified.
- **Cross-round anchoring.** The same session reviews all three rounds, so cross-round anchoring is possible; the per-round disk reread (already the engine's transaction rule) is the mitigation rather than reviewer freshness. Reviewer independence from the coordinator's own auto-answers is given up; the autonomy audit log remains the guard against rubber-stamping.
- **Contract tests.** `test/explore-pipeline-supervision.test.js` pins item-10 wording that this change intentionally rewrites (cap-exhaustion-no-design, reviewer-failure-no-design, `finding_history`, pass-block reporting, policy wording); those assertions are updated at implementation. The manual-loop contract assertions (`test/change-overview-contract.test.js`) stay green.

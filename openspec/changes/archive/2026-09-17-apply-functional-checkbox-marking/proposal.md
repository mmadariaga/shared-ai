> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Commit `8892196f` deleted `sai/commands/apply/instructions.md`. Its numbered steps 3 and 4 owned the apply Human Verification gate and the batched per-Step checkbox write; step 5 survived as `sai/commands/apply/runner.md`, but 3 and 4 survived nowhere. `/sai-4-apply` therefore silently stopped marking the checkboxes that `openspec/specs/apply/spec.md` still requires it to mark, and both Step-execution workers are barred from marking them, so no owner remained.

Since ADR 0019 fixed the post-report gate order, apply gained a terminal functional review that empirically re-exercises exactly the checks the human gate used to guard. The repair therefore re-decided the gate order instead of restoring ADR 0019 verbatim: the coordinator writes Automated checkboxes per Step, and the terminal functional review writes the Functional ones it could verify.

## What Changes

- `sai/commands/apply/runner.md` gains a `### Step checkbox marking (Automated)` section: after the coordinator's own verification of a Step passes, it marks that Step's **Automated** checkboxes `[x]` in one batched update, in the same slot as the appendix writes, restating the ADR 0018 per-Step override for apply only. Functional checkboxes are never marked in that slot. The two appendix sections lose their "when applicable, the Human Verification gate confirms" condition, and the terminal functional review is described as writing the Functional checkboxes it verified rather than as read-only.
- `sai/commands/apply/steps/terminal-lifecycle.md` makes the terminal functional review mark `[x]` exactly the checks whose verdict is `pass`; `fail` and `unverifiable` stay `- [ ]` and are reported as pending human review. Coverage is the aggregated **Functional** checkboxes, reading `**Functional (...)**` and the legacy `**Human (...)**` header as the same block, with already-marked checks outside coverage. The Final sweep blocks only on unmarked Automated checkboxes and reports unmarked Functional ones without blocking.
- `sai/commands/apply/coordinator.md` scopes re-run rendering, entry marking, machine seeding, recovery-exhaustion blocking, and the incomplete-run condition to Automated checkbox state; removes the per-Step Human Verification gate from the session-grant scope boundary; and collapses the terminal print cluster from (a)(b)(c) to (a)(b), identical with and without fast-track.
- `sai/commands/apply/invocation.md` redefines completion as every Step's Automated checkboxes marked plus a report of Functional checks pending human review, and removes the fast-track human-marking branch.
- `sai/commands/implement/implementation-plan.template.md`, `instructions.md`, `steps/common.md`, `steps/plan-generation.md`, `steps/validation.md`, and `worker.md` rename the plan's `**Human (...)**` block to `**Functional (...)**`, restate the STOP & COMMIT text to commit after Automated checks pass, and forbid emitting the legacy header in new plans.
- `sai/commands/meta-build/coordinator.md` restates injected fast-track as commit pre-authorization plus branch auto-stay only, with functional checks handled identically with and without fast-track.
- `docs/adr/0186-gate-order-without-per-step-human-gate.md` records the new gate order and supersedes `docs/adr/0019`, whose status becomes Superseded; `docs/adr/0000-INDEX.md` registers 0186 in both command and cross-cutting sections, adds the relationship-table row, and moves 0019 into the historical section with its supersession note.
- Implemented scope drift: `test/apply-routed-architecture.test.js`, `test/build-coordinator.test.js`, and `test/implementation-adapter-step-1.test.js` re-point their assertions from Human-Verification and human-check wording to the coordinator-verification, fast-track-parity, and functional-check-encoding wording.

## Capabilities

### New Capabilities

- Terminal functional review checkbox marking: the review's execute stage is the single writer of Functional checkboxes, marking only `pass` verdicts and leaving the rest as an explicit pending-human-review terminal state.
- Functional-block vocabulary with legacy read compatibility: `/sai-3-implement` emits `**Functional (...)**` only, while `/sai-4-apply` reads `**Functional (...)**` and `**Human (...)**` as the same block, so existing plans need no migration.

### Modified Capabilities

- `apply`: per-Step checkbox marking is scoped to Automated checkboxes, restored in the runner beside the appendix writes.
- `apply-final-sweep`: the sweep blocks on unmarked Automated checkboxes only.
- `apply-completion-clarity` and apply completion/chaining: completion and the chained transition evaluate Automated state only.
- `terminal-review` and `terminal-report`: the review writes the Functional checkboxes it verified, and the print cluster is fast-track-independent.
- `apply-human-verification-gate`: the per-Step human gate is removed from apply.
- `apply-coordinator-ownership`, `apply-step-projection`, `apply-standalone-state-machine`, `apply-execution-telemetry-appendix`: coordinator gate ownership, entry marking, Step-cursor derivation, and the appendix slot lose their human-gate conditions.
- `implementation-md-noop-marker`: the absent-check italic note is expressed in Functional vocabulary.
- `commit-auth-gate`, `sai-build-command`, `sai-fast-track-flag`: the session grant and injected fast-track no longer reference an apply Human Verification gate or a deferred combined list.

## Impact

New files:
- `docs/adr/0186-gate-order-without-per-step-human-gate.md`

Modified files:
- `docs/adr/0000-INDEX.md`
- `docs/adr/0019-coordinator-gate-ordering-after-subagent-report.md`
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/invocation.md`
- `sai/commands/apply/runner.md`
- `sai/commands/apply/steps/terminal-lifecycle.md`
- `sai/commands/implement/implementation-plan.template.md`
- `sai/commands/implement/instructions.md`
- `sai/commands/implement/steps/common.md`
- `sai/commands/implement/steps/plan-generation.md`
- `sai/commands/implement/steps/validation.md`
- `sai/commands/implement/worker.md`
- `sai/commands/meta-build/coordinator.md`
- `test/apply-routed-architecture.test.js`
- `test/build-coordinator.test.js`
- `test/implementation-adapter-step-1.test.js`

Known boundaries carried by this record: a per-Step commit may land before the Step's functional checks are exercised; a run may complete with zero Functional checkboxes marked; `implementation.md` has no staging path into any commit, a pre-existing defect that also affects the appendix writes and is not addressed here; existing capability ids such as `apply-human-verification-gate` are not renamed.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

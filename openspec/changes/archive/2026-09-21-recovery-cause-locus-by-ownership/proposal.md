> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A blocked `/sai-4-apply` Step halted for human input even when a worker still resumable in the same run could have corrected the cause. `sai/policies/bounded-recovery.md` enumerated "test" as an `out-of-scope` locus, so a stale constructor call in a test file was classified out-of-scope purely for being a test — although RED owns test files for the whole run. That enumeration contradicted the same definition's general clause, which already said `out-of-scope` means any boundary where no in-run worker holds an authorized correction boundary. The result was an unattended run that stopped on a cause someone in the run was authorized to fix.

The second half of the problem was budget shape: the apply coordinator held two separate "at most one per segment" caps (plan-artifact repair, last-resort infra fix) expressed only in prose, with the worker ledger resetting at composition-segment boundaries rather than per Step, and with no counter behind the coordinator's own attempts.

## What Changes

- `sai/policies/bounded-recovery.md`: the `out-of-scope` definition stops enumerating "test" and is decided by ownership — no in-run worker holds an authorized correction boundary over the concrete point. `owner-in-run` now covers a concrete point in an authorized artifact, production or test. A cause located in a test file is `owner-in-run` whenever a test-owning worker is still resumable, and is routed to that owner, never to a worker whose contract forbids test files. A new paragraph declares that the ownership classification reaches every consumer of the shared policy, including the Direct Build (unattended) route, where the effect is neutral.
- `sai/policies/bounded-recovery.md` item 1 and item 10: the ledger is scoped per **recovery scope** — the Step for a Step-executing adapter (apply), the composition segment for an adapter that executes no Steps — and is reset on entry to each scope. Every later reference to "that segment's ledger" is defined to mean the ledger of the active recovery scope. A one-adapter invocation that executes no Steps keeps scope identical to the invocation. The changed-files union is still never reset.
- `sai-state/machines/recovery-ledger.js`: `recovery-ledger@1` gains `coordinator_attempts` in its state, a `COORDINATOR_BUDGET` of 3, and a coordinator-attempt signal branch (`kind: 'coordinator-attempt'` or `scope: 'coordinator'`) that spends one attempt and reports its ordinal through `stage`, or rejects with `exhaustion` once three are spent. Coordinator attempts are counted separately from the three worker slots; a reset clears both budgets together; `next.follow` stays `none`.
- `sai/commands/apply/coordinator.md`: the unblock ladder is traversed autonomously — the coordinator routes rather than writes, never asks the user which rung to take, and opens no per-incident prompt. New rungs and rules: Step-scoped budgets with the `reset <id> recovery-ledger@1` on Step entry; auto RED-owner retry reclassified from `in-scope` to `owner-in-run`; delegate-before-self-edit (a GREEN-only Step dispatches a fresh RED rather than the coordinator writing the test; an exhausted or vetoed RED owner escalates); the plan-artifact repair and the last-resort infra fix both draw one attempt from the single three-attempt per-Step coordinator budget instead of their former one-per-segment caps; enumerated stopping reasons; and a one-line-per-correction autonomous trace reported at run close as conversation text only.
- `sai/commands/apply/runner.md`: a cause that sits in a test file is classified by ownership, routed to the resumable same-Step RED owner with no user prompt, and never to GREEN.
- `sai/commands/explore/steps/pipeline-direct-build.md`: both **Failures** (E3) blocks declare that Bounded Recovery classifies Cause Locus by ownership and that this reaches the route with no behavior change, because its single implementer already owns both tests and production.
- `GLOSSARY.md`: the **Cause Locus** and **Known-False Report Recovery** definitions are restated for ownership-based classification and the coordinator budget of three attempts per Step.
- Tests: three suites gain nine tests covering the ownership classification, the per-recovery-scope pool with the preserved changed-files union, the autonomous ladder, the coordinator-never-writes-a-test rule, budget exhaustion and the enumerated stopping reasons, the coordinator attempt counter, its separation from the worker slots, and the reset of both budgets.

Worker scope itself is unchanged: `sai/commands/apply/green-worker.md` and `sai/commands/apply/red-worker.md` are not touched, so GREEN keeps its absolute test-file prohibition and RED keeps its production prohibition.

## Capabilities

### New Capabilities

- **Ownership-based Cause Locus classification** — `out-of-scope` and `owner-in-run` are decided by who holds the authorized correction boundary, never by the kind of artifact the cause sits in.
- **Coordinator-led autonomous unblock ladder** — the apply coordinator traverses RED-owner retry → delegate → last-resort infra fix → human dead-end with no user prompt per incident, under a state-store-held budget of three coordinator attempts per Step, with enumerated stopping reasons and a reported correction trace.
- **Test-located cause routing in the apply runner** — a test-located cause routes to the resumable same-Step RED owner and never to GREEN.

### Modified Capabilities

- **Bounded worker recovery** — the three-slot ledger is scoped and reset per recovery scope (Step for a Step-executing adapter, composition segment otherwise) instead of per composition segment.
- **`recovery-ledger@1` stage machine** — carries the coordinator budget alongside the worker slots and rejects a fourth coordinator attempt as `exhaustion`.
- **Known-False Report Recovery branching in apply** — the one-repair-per-segment cap is replaced by the per-Step coordinator budget, and a repair beyond the exhausted budget is the unresolved human hand-back.

## Impact

Modified files:

- `sai/policies/bounded-recovery.md`
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/runner.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai-state/machines/recovery-ledger.js`
- `GLOSSARY.md`
- `test/apply-coordinator-verification.test.js`
- `test/bounded-worker-recovery.test.js`
- `test/recovery-ledger-machine.test.js`

New files: none.

Unchanged by design: `sai/commands/apply/green-worker.md` and `sai/commands/apply/red-worker.md`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

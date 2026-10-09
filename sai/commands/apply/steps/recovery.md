# Apply Step — Known-False Report Recovery

Loaded when a Step fails: `apply-step.js verify` returned `ok: false`, a RED or GREEN result is `failed` or carries a STOP, or your evidence disproves a `completed` report. Load it before any recovery attempt. It is the only place these rules live, including the trace format; the card only prints the trace at run close, and the exhausted-Step choice is separate (`steps/exhausted-step.md`).

Applies to standalone `/sai-4-apply` and to the apply segment of `/sai-build`.

**Goal.** Bring the Step to a passing coordinator § Post-dispatch sequence without weakening what it verifies, or stop for a human. Recovery is complete when that verify passes and its judgments are made, or when one of the stops below applies.

## What other owners decide

- `recovery-ledger@1` owns the budgets, their grant on the Step's first entry, key normalization, the `rejected: duplicate diagnosis` and `rejected: unresolved cause` answers, and `exhausted`. Worker-returned failures and your `validation-failed` classifications draw from one worker pool. Read every tally from its response; when the ledger gives none, count nothing from memory, run no recovery attempt, and stop the Step.
- `@sai/policies/bounded-recovery.md` owns diagnosis, Cause Locus, eligibility, the hand-back, and the rule that an eligible diagnosis continues the owning worker with `continue_after_recovery`, including that a cause in a test file goes to its RED owner and never to GREEN.

## Invariants

1. **Classify before correcting.** Classify a disproven report `validation-failed` before any `continue_after_recovery`. Read project source or test files only now, to diagnose.
2. **Continuation content.** Every `continue_after_recovery` carries the policy's five fields in this order, with no raw output or artifact contents: `Reported`, `Evidence`, `Cause`, `Correction` (one safe, reversible correction inside the current Step and the worker's scope), and `Verification` (the dispatch's Verification Checklist and its pass condition). After the return, run the Post-dispatch sequence again. The continuation keeps every blindness rule and prohibition: RED stays blind to the GREEN body and inside tests and stubs; GREEN stays in production files and never touches tests, declared interfaces, or `implementation.md`. No continuation runs git or explores beyond its worker contract.
3. **Test-infra cause.** A GREEN `blocking-contradiction` that proves a test-infra point (setup, adapter, seed, import wiring) resumes this Step's RED worker with `continue_after_recovery`, with no hand-back or prompt first (trace rung `red-owner-retry`).
4. **Fresh-RED exception.** Apply declares one exception to the policy's no-replacement rule: when the Step had no RED dispatch (GREEN-only) and the cause is in a test, dispatch a fresh RED worker for that correction (trace rung `delegated-dispatch`). A delegated dispatch spends a coordinator attempt exactly as a self-edit does, so an exhausted coordinator budget stops the Step even with worker slots left.
5. **Coordinator key.** Before each coordinator attempt (an infra fix, a plan-artifact repair, or a delegated dispatch) send `{kind: coordinator-attempt, key: [artifact path, concrete point, authorized correction boundary]}` to the ledger and announce the returned ordinal. A rejected key spends nothing and hands back the existing diagnosis.
6. **A hand-back or an exhausted budget** blocks Automated checkbox marking, commit, and Step advance for the Step. Remaining budget never authorizes a forbidden correction, and destructive or shared-system actions stay gated by safe-operations.

## Plan-artifact repair

An `out-of-scope` cause spends zero worker attempts and goes to its owner. One exception: when the evidence identifies the exact current-Step verification assertion in `implementation.md` as the defect (for example, it names a later Step's producer that cannot exist yet), you MAY repair that one assertion, spending one coordinator attempt and no worker slot (trace rung `plan-artifact-repair`). The repair writes only that assertion, preserves Step headings, checkbox semantics and states, plan-level file scope, worker prohibitions, and the verification checklist and run boundary, and never runs verification as part of its write. Add `implementation.md` to the union once, then run the Post-dispatch sequence, whose independent verification stays mandatory; the repair never becomes worker work.

**Coverage Signature.** The verification's coverage must stay identical: its commands, paths, selectors, assertion operators and targets, and expected pass or fail observations are unchanged, and exactly one producer reference changes, from the impossible later-Step point to an existing current-Step point. Nothing is deleted, disabled, broadened, or loosened. Any other change, or a repair past the coordinator budget, stops the run for a human.

## Unpassable RED and scaffolding repair

RED is unpassable when it closes with the unpassable STOP: the fix lies outside the files its contract lets it write. When no worker-safe path remains and the cause is test scaffolding that lives outside test files (helpers, adapters, seed data), you MAY repair it yourself, spending one coordinator attempt (trace rung `infra-fix`). Never write an assertion body, an expected value, production semantics, or a test file. Preserve Step headings, checkbox semantics, prohibitions, and the Coverage Signature; add each touched path to the union; then run the full Post-dispatch sequence. A cause inside a test file the RED worker may not write has no coordinator path: stop and ask the user.

## Vetoes

A worker `unrecoverable: true` stops the Step at once: Fetch @sai/commands/apply/steps/veto-override.md. A veto your own evidence disproves is a false veto and stays recovery-eligible; the veto alone never authorizes GREEN.

## Stops

Traverse the rungs autonomously: route rather than write, and never ask the user which rung to take. The only reasons to stop for a human besides exhaustion are: weakening or deleting an assertion, redefining the agreed contract (`implementation.md` or the change's specs), a safe-operations gate, a true veto, a pre-existing failure outside the change's radius, and the unwritable test cause of § Unpassable RED and scaffolding repair. Nothing else interrupts an unattended run.

After a hand-back that is not an exhaustion, an explicit human order naming a viable point may re-attempt with a new key in the same budget; ordinary Step re-entry never resets it. A non-viable point, an un-lifted veto, a safe-operations denial, or a missing `## Step N` contract stays blocked, reported with the policy's hand-back fields.

## Trace

Record one line per autonomous correction, zero-cost outcomes included: `> Autonomous correction: Step <N> | <rung> | key <path> :: <point> :: <boundary> | <budget> <ordinal> of 3 | <outcome>`. `<rung>` is `red-owner-retry`, `delegated-dispatch`, `plan-artifact-repair`, or `infra-fix`; `<budget>` is `worker` or `coordinator`; `<ordinal>` is the ordinal the ledger returned (`0` when nothing was spent); `<outcome>` is `corrected`, `unchanged`, or the returned `rejected` value. The coordinator card prints the collected lines at run close.

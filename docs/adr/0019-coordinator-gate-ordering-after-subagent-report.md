# ADR 0019: Fixed gate ordering after a Step-execution subagent's report

## Status

Accepted

## Context

Under `delegate-apply-steps-to-subagent`, after a Step-execution subagent reports, the coordinator must run four pre-existing, unmodified gates plus one new step in some order: its own automated Verification Checklist re-run (`apply-coordinator-verification`), the existing Human Verification checklist (`apply-human-verification-gate`), batched checkbox marking (`apply-step-delegation`), incorporating the report's technical learnings into memory (`apply-technical-learnings-memory`), and the existing STOP & COMMIT checklist. Neither the proposal nor any of the five new capability specs states the relative order of these five actions — it had to be designed.

Two of the existing, unmodified requirements constrain the ordering: `apply-coordinator-verification` requires the coordinator's own re-run to pass "before marking a Step's checkboxes or proposing a commit"; `apply-human-verification-gate` requires the Human Verification checklist to be presented "before marking items `[x]`". Getting this ordering wrong would silently regress a pre-existing safety guarantee (marking or committing without genuine verification, or without human sign-off).

## Decision

Fix the order as: (1) coordinator re-runs the Verification Checklist itself — quiet confirmation only, not the RED→GREEN cycle; on mismatch, surface the discrepancy to the user and do not mark or propose a commit; (2) immediately after a matching pass, incorporate the report's technical learnings into the coordinator's in-context memory; (3) present the existing Human Verification checklist and wait for user confirmation; (4) on confirmation, mark the Step's checkboxes in one batched update and write any deviations to the appendix; (5) run the existing, unmodified STOP & COMMIT checklist (propose message, ask `y/n`, commit only on explicit `y`; on `n`, describe the staged changes for the user to commit manually).

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Mark checkboxes immediately after the coordinator's own automated re-verification, decoupled from human sign-off | Simpler, fewer sequential gates before progress is recorded | Violates `apply-human-verification-gate`'s existing, unmodified requirement that the checklist be presented before marking items `[x]` |
| Fixed order: verify → incorporate learnings → human gate → mark → STOP & COMMIT (chosen) | Satisfies both existing requirements simultaneously without contradiction; learnings are captured even if the human later declines to commit | One more sequential gate than the minimal path; slightly more coordinator turns per Step |

## Consequences

- Every Step now passes through five sequential gates before a commit can happen; this is intentional overhead in exchange for preserving every pre-existing safety guarantee.
- Because learnings incorporation happens right after verification (step 2) but before the human gate (step 3), a learning is captured even on Steps where the human later says `n` to the commit — this is deliberate: the Step's code was genuinely verified, so its friction is still reusable for later Steps regardless of the commit decision.
- A future change that reorders these gates must re-verify against both `apply-coordinator-verification` and `apply-human-verification-gate` to avoid silently reintroducing the "mark/commit before verification" or "mark before human sign-off" regressions this ADR exists to prevent.

## Related

- `openspec/changes/delegate-apply-steps-to-subagent/design.md` — Decision D3
- `openspec/changes/delegate-apply-steps-to-subagent/specs/apply-coordinator-verification/spec.md`
- `openspec/specs/apply-human-verification-gate/spec.md` (existing, unmodified)
- `openspec/changes/delegate-apply-steps-to-subagent/specs/apply-coordinator-authority/spec.md` — STOP & COMMIT `n` branch

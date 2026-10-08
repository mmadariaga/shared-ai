# Apply Step — Veto Override

Loaded only when a worker returns `unrecoverable: true` for the active Step, at any attempt. The veto stops the Step at once; the user, who sees the worker's evidence, may lift it. The lift removes the veto only: the Step becomes recovery-eligible within its remaining budget under `@sai/policies/bounded-recovery.md` § Eligibility. Renewing budgets stays exclusive to `authorized-step-retry`.

Applies to standalone `/sai-4-apply` and to the apply segment of `/sai-build`.

## Procedure

1. **Record.** Send `{kind: veto, step: "Step N"}` to `recovery-ledger@1` and require `veto: recorded`. A veto your own evidence disproves is a false veto (`steps/routing-split-flow.md`); it stays recovery-eligible and this file does not apply.
2. **Show.** Print the worker's evidence from the result `summary` (non-raw), the worker role (RED or GREEN), the blocked Step, the affected path, and both budget tallies from the ledger response. State that the Step stays unmarked, uncommitted, and unadvanced, and that lifting the veto authorizes only a recovery attempt by the same worker, not a commit or any bypassed check.
3. **Ask.** Present through the active harness's native picker, following `@sai/policies/question-context.md`. Question: `The worker vetoed Step N as unsafe to continue. How do you want to proceed?`. Options, in order: `Lift the veto` (`authorize-veto-override`); `I will correct it manually` (`manual-correction`). Never auto-select, neither under `--fast-track` nor under `session_commit_authorized`. A question, a general request for help, silence, or an off-option answer authorizes nothing; re-present the same choice unchanged. An unequivocal order naming this exact Step and the veto counts as the lift option.
4. **Decline.** On `manual-correction`, keep the manual-correction stop: same evidence, same stopping reason, Step still blocked.
5. **Lift.** On `authorize-veto-override`, send `{kind: authorized-veto-override, step: "Step N", authorized: true}`. Require `veto_override: granted`. On any `rejected` value (for example `no active veto`), change nothing, report the rejection, and keep the manual-correction stop. Each event lifts exactly one veto: a later veto in the same Step stops the run again and asks for a new authorization.
6. **Continue.** With the veto lifted, run the ordinary § Known-False Report Recovery diagnosis for the result. An eligible diagnosis resumes the same worker that vetoed (RED or GREEN) with `continue_after_recovery`; RED blindness, the allowed files, and every worker prohibition are preserved. When the diagnosis is ineligible for another reason, hand it back with that reason.

## Limits

- The lift removes only the veto. A simultaneous safe-operations denial, an assertion weakening or deletion, a contract redefinition, a pre-existing failure outside the change's radius, and `apply-step.js verify`, the commit gates, and safe-operations confirmations keep blocking as today.
- When a budget is also exhausted, the lift only makes the Step eligible; the coordinator's exhausted-Step choice follows, with its separate `authorized-step-retry`. The user answers the two authorizations in sequence.
- The lift is complete once the answer is recorded and the ledger accepted or rejected the event.

# Apply Step — Already Satisfied

Loaded only when a RED return reports `RED result: passes`. A passing test means one of two things the tools cannot tell apart: the behavior already exists, or the test checks nothing real. Only the user can say which, so this file ends in a question that is never auto-answered. `passes` never unlocks GREEN, in either answer.

Applies to standalone `/sai-4-apply` and to the apply segment of `/sai-build`.

## Procedure

1. **Evidence.** Run coordinator § Post-dispatch sequence once with `apply-step.js verify ... --dispatch red --already-satisfied` (same checkpoint, baseline, settled, and field 8 stdin as the ordinary call). The mode expects the Step test command to pass, runs the Step's Automated items, and allows test files only. When it returns `ok: false`, the `passes` report is disproved or the Step changed a production file: this file does not apply; run § Known-False Report Recovery on that result.
2. **Show.** Print the test files the RED worker wrote, the Step test command and its result (exit code and `tail`, from the `step-test-command` entry of `commands`), and the Step's production files that stay untouched (`untouched`). State that the Step stays unmarked, uncommitted, and unadvanced until the answer, and that no GREEN is dispatched.
3. **Ask.** Present through the active harness's native picker, following `@sai/policies/question-context.md`. Question: `The tests for Step N pass without any production change. What does that mean?`. Options, in order: `The behavior already exists` (`already-satisfied`); `The test checks nothing real` (`vacuous-test`). Never auto-select, neither under `--fast-track`, nor under `session_commit_authorized`, nor in `/sai-build`. A question, a general request for help, silence, or an off-option answer authorizes nothing; re-present the same choice unchanged. An unequivocal order naming this exact Step and one option counts as that option.
4. **Vacuous test.** The same RED worker owns the tests, so the cause is `in-scope` for it. Build the key `(<test file>, <test or assertion that passes without the behavior>, red-worker-test-authoring)` from the worker's report and send it to `recovery-ledger@1` as `@sai/policies/bounded-recovery.md` § Recovery attempt describes. The attempt spends a worker slot. Resume the same RED worker with `continue_after_recovery`: Cause is that the test passes without the behavior, Correction is to harden the assertions inside its allowed test files so the test fails by assertion on the missing behavior, Verification is the Step test command failing by assertion. The worker stays blind. Its return is an ordinary RED return under the RED gate; a second `passes` loads this file again and needs a new key. A duplicate or non-concrete key hands back with its stopping reason; an exhausted worker budget leads to the coordinator's exhausted-Step choice.
5. **Already satisfied.** Close the Step with no GREEN dispatch, mirroring `routing-green-exception-test-only.md`: the RED tests are committed and `GREEN result` stays `n/a`.
   1. Judge the `unjudged` items of the step 1 verify as usual.
   2. Print exactly `> ALREADY SATISFIED: Step N — <untouched production paths> left unchanged; the user confirmed the behavior already exists`.
   3. Record (Step loop step 4): add an Appendix block titled `### Step N — Already satisfied: <behavior>`, with **Plan:** the production files the Step would have changed, **Final:** tests only, production files untouched, **Reason:** RED passed on existing behavior and the user confirmed it.
   4. Close through runner § Step commit gate, adding `--already-satisfied` to `close --dry-run`, `close`, and `close --mark-only`. The message describes the tests only. Untouched production files raise no `DEVIATION`; any `DEVIATION` or `scope-blocked` here means a production file changed, and it goes to § Known-False Report Recovery, never to `steps/plan-amendment.md`.

## Limits

- The mode relaxes only the untouched production files. The Step test command, every Automated item, the allowed files, the guard, and the commit gates keep their ordinary force.
- Each answer is recorded by the action it triggers; no answer persists beyond this Step.

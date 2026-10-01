> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Any failure nobody anticipated stopped an unattended run, even when fixing it needed nothing beyond what the user already authorized. The closed per-worker recovery allowlist of the unattended lanes (`sai/policies/unattended-runtime-recovery.md`) and the failed-to-decline-close default of the review Direct Build close (`sai/commands/meta-review/direct-build-close.md`) listed what could be recovered and stopped on everything else. A Direct Build run died on a coordinator-authored contradiction in its own input that one in-envelope correction would have resolved.

## What Changes

- `sai/policies/unattended-runtime-recovery.md` becomes the single source of one open resilience rule: "Can the error be corrected and the planned process continued with the information already available, without leaving what the user authorized?" A yes means correct, retry, and log; a no means stop with a clear report. Its Recovery decision states six limits (agreed content, authorization, available information, planned process, one-shot operations, budget); the per-worker continuation list and the generic re-dispatch prohibition are removed; the Stop condition defines the stop notice once.
- The policy's scope extends to every unattended lane: Explore Plan - Unattended, Explore Direct Build - Unattended, and the Direct Build close of `/sai-5-review` and `/sai-review`. The `--no-specs` POC profile stays excluded.
- The Explore pipeline steps replace their local failure branches with a pointer to the rule. `direct-build-close.md` loads the policy, applies the rule to any other failed result or malformed fix-worker payload within the existing three-round cap, and records corrections for the terminal report.
- The coordinator corrects input it authored (non-agreed block text, envelope, continuation text) and re-dispatches; agreed content passes through unchanged.
- `sai/orchestration/worker-core.md` gains an Authority section: authorization arrives with the dispatch, and process statements in worker input are non-normative context that the worker neither applies nor copies into artifacts and lists in its result summary; an ambiguous statement that conflicts with a route operation yields to the route operation.
- `sai/policies/ready-to-propose-format.md` defines `Key constraints` as constraints and non-goals of the change's own behavior and scope, and its emission sweep checks that every line constrains the change.
- `sai/policies/autonomy-audit-log.md` adds entries for automatic corrections and ignored process statements; the review Direct Build close produces that record too.
- `sai/orchestration/command-runner.md` requires every worker payload to reach the validator exactly as received, and treats a malformed payload in an unattended lane as a failure under the rule with a fresh result requested from the worker.
- `sai/tools/worker-report-validator.js` parses closed-subset YAML payloads in addition to JSON through a shared `parsePayloadText`, and `bin/sai-state.js` `emit --progress` uses the same parser.
- `test/unattended-runtime-recovery.test.js`, `test/worker-report-validator.test.js`, and `test/sai-state-progress-emit.test.js` are updated to the new behavior.

## Capabilities

### New Capabilities

- `unattended-resilience-rule`: the open resilience rule, its six limits, the shared budget, and the single-sourced stop notice for the unattended lanes.
- `coordinator-self-correction`: the coordinator corrects input it authored and re-dispatches, leaving agreed content unchanged.
- `worker-input-authority`: workers take authorization from the dispatch and treat process statements in their input as non-normative context.
- `payload-validation-fidelity`: worker payloads are validated exactly as received, and the validator accepts JSON or closed-subset YAML mappings.

### Modified Capabilities

- `bounded-worker-recovery`: the unattended runtime-repair requirements follow the open resilience rule.
- `explore-pipeline-supervision`: the Plan and Direct Build unattended routes apply the rule to every non-clean outcome, including backfill and archive worker failures before their closed order completes.
- `pipeline-autonomy-audit-log`: corrections and ignored process statements are reported, and the Direct Build final-report exception covers only the auto-answer audit.
- `review-direct-build-close`: failed fix results follow the resilience rule within the existing round cap.
- `shared-crystallization-block-format`: `Key constraints` carries only constraints of the change itself.

## Impact

- Modified files: `sai/policies/unattended-runtime-recovery.md`, `sai/policies/autonomy-audit-log.md`, `sai/policies/ready-to-propose-format.md`, `sai/commands/meta-review/direct-build-close.md`, `sai/commands/explore/steps/pipeline-direct-build.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/orchestration/worker-core.md`, `sai/orchestration/command-runner.md`, `sai/tools/worker-report-validator.js`, `bin/sai-state.js`.
- Modified tests: `test/unattended-runtime-recovery.test.js`, `test/worker-report-validator.test.js`, `test/sai-state-progress-emit.test.js`.
- New files: none.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The originating incident ran on opencode. The Explore coordinator wrote "This block authorizes proposal preparation, not implementation…" into `Key constraints`, and the Direct Build worker correctly returned failed. The coordinator then re-serialized the worker's YAML payload as JSON before validating it. E7, E8, I5, I6, and I8 cover that path as one instance of the general rule, not as its center.

The POC profile stays excluded because a POC failure is the experiment's observation, and correcting it automatically could hide the result that decides between the competing hypotheses.

> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The pipeline reviews its products with the workers and framing that produced them: the plan review rounds read the artifacts the plan workers just wrote, and `/sai-4-review` reads the diff through the change's own framing. A defect that producer and reviewer share reaches the user. The user has no cheap, repeatable way to get an independent expert opinion at the moments a product is about to settle: the crystallized change documents before route selection, the plan artifacts before the design segment commits them, and the built code before the build closes. More rounds inside the existing workers add no independent viewpoint.

## What Changes

- Add the routed worker `sai-adversarial-expert-review-worker` on a new `expert-review` phase of the worker matrix. It is pinned with the binding stem `adversarial-expert-review` and its contract `sai/commands/adversarial-expert-review/worker.md`, materialized as a managed agent on Claude Code and opencode, and given a `worker-expert` capability profile with read, edit, write, and shell access and no subagent dispatch. The managed roster becomes fifteen workers per harness, and every shipped preset carries its `worker:sai-adversarial-expert-review-worker` model entry.
- Add the policy `sai/policies/adversarial-expert-review.md` as the single source of the answer, the Start and reconciliation questions, the worker cycle, the keep-or-revert decision, verification, and the closing report lines.
- Add `--expert-review [no|auto|ask]` to `/sai-plan` and `/sai-build`, resolved once at Start from the argument, the recorded run-state answer, then one native question, where a bare flag is `auto` and an invalid value ends the run before anything is written. `/sai-plan` records it in `plan-run@1`; `/sai-build` records it in `implement-run@1`. Segment callers pass `--expert-review no`, and `/sai-3-implement` strips and ignores it.
- Add the checkpoint to the three offering commands: `/sai-explore` asks a yes/no question after printing the crystallized documents and before round 1 of its pre-route actions; `/sai-plan` runs it inside the design segment after the review rounds and before its two commits; `/sai-build` runs it after the last implementation segment that ran and before the decision records, the telemetry, and the publication.
- Add document mode, where the explore checkpoint exports every document of the set with its hash, reviews the set against each document's agreed Goal, Scope, Capabilities, and Edge cases, and returns corrected copies that are re-validated with `change-document.js check` and re-emitted with `--amend`.
- Add mutations mode, where the plan and build checkpoints review working-tree paths, report each finding through `sai/policies/artifact-review-contract.md` with the paths its correction changed, and keep or revert each correction from a `review-delta.js` before-snapshot.
- Add `restore <tree> <path ...>` to `sai/tools/review-delta.js`: it writes the named working-tree paths back to their snapshot content, removes the paths the tree does not hold, leaves the index untouched, and reports the verdicts `restored`, `refused`, `failed`, or `n/a`.
- Add `--command adversarial-expert-review` to `sai/tools/worker-report-validator.js`: a `completed` report requires the closed `findings` list, with severities `High`, `Medium`, and `Low`, and admits `corrected_documents` in document mode.
- Add the closed-choice `expert_review` and `expert_review_checkpoint` fields to `plan-run@1` and `implement-run@1` through a shared `choices` declaration in `sai-state/machines/run-core.js`, so a resumed run reuses the answer and runs the checkpoint once.
- Update `sai/policies/worker-report-transport.md` and `sai/policies/artifact-review-contract.md` for the reviewer's report and findings, and update `README.md`, `AGENTS.md`, and the `/sai-explore`, `/sai-plan`, and `/sai-build` usage pages for the flag, the modes, and the checkpoints.
- Update the installer, the worker-matrix roster checks, the presets, and the test suite for the fifteen-worker roster and the new report shape.

## Capabilities

### New Capabilities

- `adversarial-expert-review`: the pinned reviewer worker, its report, the three checkpoints, document and mutations modes, and keep-or-revert of corrections.
- `expert-review-answer`: the `--expert-review` flag, the recorded answer and checkpoint state, the reconciliation modes, and the Start and reconciliation questions.

### Modified Capabilities

None.

## Impact

- New files: `sai/commands/adversarial-expert-review/worker.md`, `sai/policies/adversarial-expert-review.md`, `test/adversarial-expert-review.test.js`.
- Commands: `sai/commands/build/coordinator.md`, `sai/commands/design/coordinator.md`, `sai/commands/implement/coordinator.md`, `sai/commands/plan/coordinator.md`, and `sai/commands/explore/steps/crystallization-protocol.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/commands/explore/steps/route-selector.md`.
- Run state: `sai-state/machines/run-core.js`, `sai-state/machines/plan-run.js`, `sai-state/machines/implement-run.js`.
- Tools: `sai/tools/review-delta.js` (the `restore` sub-command and verdicts), `sai/tools/worker-report-validator.js` (the `adversarial-expert-review` command shape).
- Installation: `sai/install-manifest.json`, `bin/worker-matrix.js`, `bin/install-flow.js`, `bin/install-manifest.js`, and the five presets under `sai/presets/`.
- Policies: `sai/policies/artifact-review-contract.md`, `sai/policies/worker-report-transport.md`.
- Documentation: `AGENTS.md`, `README.md`, `docs/commands/sai-build.md`, `docs/commands/sai-explore.md`, `docs/commands/sai-plan.md`.
- Tests: the matrix, installer, preset, doctor, review-delta, run-state, and validator suites move to the fifteen-worker roster and the new report shape.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

- The exact question wording, the worker brief, and the per-harness default model are card-level details; the model stays user-configurable in the setup.

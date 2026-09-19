> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The POC-lane and review-close rollout left four command cards carrying clauses that contradict the behavior that actually shipped. Command cards in this repository are runtime inputs, not documentation: an agent loads them and acts on them, so a stale clause is an executable instruction with a user-visible effect.

Three contradictions were live. `sai/commands/meta-review/coordinator.md` delegated a zero-audit `/sai-review` run to the final adapter's terminal navigation while simultaneously pinning its own zero-audit literal and forbidding dispatches, leaving the review adapter's standalone Direct Build close reachable inside the composition. `sai/commands/review/coordinator.md` declared a coordinator exception that omitted the very diff its own fix loop reads. `sai/commands/explore/steps/pipeline-direct-build.md` ordered validation of a prepared `.openspec.yaml` against a three-key form only, while `sai/commands/backfill/instructions.md` section 6a defines a three-key form and a four-key form, and attributed the POC lane's reversible isolation to no named actor, although `openspec/specs/explore-viability-poc-pause/spec.md` already assigns it to `sai-explore`. Separately, the reachable-step-file count assertion in `test/explore-contract-preservation.test.js` had been bumped to a total that did not match the directory.

## What Changes

- `sai/commands/meta-review/coordinator.md`: the zero-audit branch is stated as terminal for the composition — print the pinned literal, dispatch nothing, and do not apply the review adapter's Direct Build close, even when `review.md` still carries findings. Using the final adapter's `terminal_navigation` there selects its presentation only, never its selector or dispatches.
- `sai/commands/review/coordinator.md`: the Direct Build close is scoped to the standalone `/sai-5-review` invocation. Inside the `/sai-review` composition the close never applies — with one or more audits activated the shared runner already resolves this non-final adapter's `terminal_navigation` to the composition transition, and in the zero-audit case the composition coordinator owns the terminal outcome. The adapter offers no selector and dispatches nothing in either composition case.
- `sai/commands/review/coordinator.md`: the coordinator's read exception is extended to cover reading the diff its fix loop verifies (the fix worker's resulting diff, read-only), without widening the artifact-blind clean route.
- `sai/commands/explore/steps/pipeline-direct-build.md`: the `--no-specs` profile's no-mutating-git prohibition is qualified as binding the dispatched implementer, not the lane's own reversible isolation, which `sai-explore` creates and abandons as the coordinator under the POC lane's isolation authority; the pinned-profile paragraph names `sai-explore` as the actor that isolates the POC before it runs.
- `sai/commands/explore/steps/pipeline-direct-build.md`: step 4 validates `.openspec.yaml` against the canonical forms of section 6a — the three-key form for a run with no usable intent context and the four-key `prior_intent: true` form for a run with usable intent context — each valid under its own condition, with no other key accepted.
- `test/explore-contract-preservation.test.js`: the reachable-step-file count is set to 13 and `route-selector.md` is added to the expected-file list.
- `test/direct-build-writes-openspec-yaml.test.js`: the assertion that pinned the retired three-key-only wording is reasserted against both canonical forms (fix-loop finding H1, corrected in round 2; round 2 converged with no findings).

No behavior that shipped in the POC-lane and review-close rollout is redesigned; every edit records what already happens.

## Capabilities

### New Capabilities

None. Every affected capability already exists.

### Modified Capabilities

- `standalone-close-selector` — the Direct Build close is bounded to the standalone `/sai-5-review` invocation, the composition's zero-audit branch is terminal, and the coordinator read exception covers the fix-loop diff.
- `explore-viability-poc-pause` — the POC lane's reversible isolation is attributed to `sai-explore` as coordinator in the command card, and the no-mutating-git prohibition is scoped to the dispatched implementer.
- `sai-backfill-metadata-flag` — the Direct Build coordinator validates a prepared `.openspec.yaml` against both canonical key forms of section 6a.

## Impact

Modified files:
- `sai/commands/meta-review/coordinator.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `test/explore-contract-preservation.test.js`
- `test/direct-build-writes-openspec-yaml.test.js`

New files:
- `openspec/changes/poc-lane-rollout-doc-coherence/proposal.md`
- `openspec/changes/poc-lane-rollout-doc-coherence/.openspec.yaml`
- `openspec/changes/poc-lane-rollout-doc-coherence/specs/standalone-close-selector/spec.md`
- `openspec/changes/poc-lane-rollout-doc-coherence/specs/explore-viability-poc-pause/spec.md`
- `openspec/changes/poc-lane-rollout-doc-coherence/specs/sai-backfill-metadata-flag/spec.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

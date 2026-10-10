> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The implementation plan contract forced complete final production code in every GREEN block (`sai/commands/implement/steps/common.md` Hard Rules), a split designed for far weaker cheap models. Tests already follow a describe-then-write model, so the planner spent effort writing code the GREEN implementer could finish against the Step's tests. `/sai-3-implement` now plans each file of a Step with a RED block anywhere on a detail range, from a skeleton with `TODO(sai-4)` what/how comments up to complete copy-paste content, and `/sai-4-apply` GREEN completes the rest under a deterministic leftover-marker check.

## What Changes

- `sai/commands/implement/steps/common.md` gains the Hard Rule **Detail range**, placed right after **Valid RED failure**. It replaces the two complete-production-code bullets with one bullet against speculative production code. The rule:
  - defines a skeleton as signatures plus one `TODO(sai-4)` what/how comment per body;
  - sets the range per kind of content: code from skeleton to complete; normative text always complete; descriptive text from instructions to complete;
  - applies only to Steps with a RED block and uses the criterion "decisions go in the plan, typing goes to GREEN";
  - lets the Step's `difficulty` set the point on the range, and gives a Step without `difficulty` the maximum;
  - names the three GREEN instructions;
  - keeps the RED block format, and keeps the `interfaces.md` signatures when the plan's content replaces the RED stub.
- The Role line of `common.md`, the first-run bullets of `sai/commands/implement/steps/plan-generation.md`, and the Pre-Delivery item of `sai/commands/implement/steps/validation.md` name **Detail range** instead of restating the complete-code rule. A `TODO(sai-4)` is allowed only in files named by `Complete the skeleton below in`.
- `sai/commands/implement/implementation-plan.template.md` shows three GREEN instructions in the Step with a RED block: `Copy and paste code below into`, `Complete the skeleton below in`, and `Write the content described below into`. Each has a placeholder pointing to **Detail range**. Steps without a RED block keep `Copy and paste` with `{COMPLETE, FINAL CODE}`.
- `sai/commands/apply/green-worker.md` lets GREEN read the Step's tests, including in recovery continuations, and keeps the absolute test-write prohibition. A new Completion section says the Step is done when the Step test passes and no `TODO(sai-4)` remains in GREEN's files.
- The GREEN task disclosure in `sai/commands/apply/steps/routing-split-flow.md` adds the paths of the Step's test files as read-only references. It still never includes declared interfaces.
- `sai/tools/apply-step.js` preflight:
  - interprets the instruction verbs from one exported, ordered `INSTRUCTION_VERBS` list: `Write the test`, `Create a minimal stub`, `Copy and paste`, `Complete the skeleton below`, `Write the content described below`, `Modify`, `Update`, `Delete`, `Remove`;
  - reports the two new verbs as an error in any Step without a RED block.
- `sai/tools/apply-step.js` verify:
  - counts `TODO(sai-4)` in each file named by `Complete the skeleton below in`, in the working tree and in `HEAD` (a file absent from `HEAD` counts 0);
  - fails when the count exceeds the Step base;
  - reports the counts as `skeleton_markers`;
  - skips the check for the `red` dispatch.
  The tool builds the marker by concatenation, so its own source never contains it.
- `README.md` names the GREEN worker in the existing model capability funnel: the `sai-3` implementation worker >= the `sai-4` GREEN worker.
- `test/apply-step-tool.test.js` covers:
  - the new-verb acceptance and rejection;
  - a pin of the full ordered `INSTRUCTION_VERBS` list, which drives preflight for every verb and checks that an unlisted verb is not interpreted;
  - `skeletonPaths` parsing;
  - leftover-marker failure and pass;
  - the HEAD-relative base;
  - the marker-free tool source;
  - the Detail range references across the plan and apply surfaces.

## Capabilities

### New Capabilities

- `implementation-plan-detail-range`: the planner chooses, per file of a Step with a RED block, how much content the plan carries, single-sourced in the **Detail range** Hard Rule.
- `green-skeleton-completion`: the GREEN worker completes skeletons and descriptive instructions, reading the Step's tests.
- `apply-skeleton-checks`: preflight interprets a pinned instruction-verb list and accepts the new GREEN instructions only in Steps with a RED block, and verify fails on leftover `TODO(sai-4)` markers relative to the Step base.

### Modified Capabilities

- `implement-red-phase-contract`: production code is complete in Steps without a RED block and follows the Detail range in Steps with one.
- `instruction-output-templates`: the implementation plan template's no-TODO rule becomes the Detail range GREEN instructions.
- `apply-red-green-worker-model`: the GREEN worker contract lets GREEN read the Step's tests instead of never receiving them.
- `apply-step-delegation`: the split-Step GREEN dispatch also names the Step's test file paths as read-only references.
- `tasks-routing-metadata`: the README capability funnel names the GREEN worker.

## Impact

- Modified: `sai/commands/implement/steps/common.md`
- Modified: `sai/commands/implement/steps/plan-generation.md`
- Modified: `sai/commands/implement/steps/validation.md`
- Modified: `sai/commands/implement/implementation-plan.template.md`
- Modified: `sai/commands/apply/green-worker.md`
- Modified: `sai/commands/apply/steps/routing-split-flow.md`
- Modified: `sai/tools/apply-step.js` (new export `INSTRUCTION_VERBS`)
- Modified: `test/apply-step-tool.test.js`
- Modified: `README.md`
- Every edit is in harness-neutral files shared by Claude Code and opencode.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Originating issue: https://github.com/mmadariaga/shared-ai/issues/52. Two of its research leads are outdated: the Claude Code seeds give the implementation worker `opus` and the GREEN worker `haiku`, not the same model, and its line numbers for `plan-generation.md` and `common.md` no longer match the files. The capability specs `implement-red-phase-contract` (complete executable production code) and `instruction-output-templates` (template placeholders) state the rule this change relaxes.

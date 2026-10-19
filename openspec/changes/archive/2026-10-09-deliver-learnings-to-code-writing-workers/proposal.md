> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Learnings reach `/sai-3-implement` and `/sai-5-review` through `tasks.md` `## Implementation Context`, but they stopped before the workers that write code: the apply RED and GREEN workers and the Direct Build implementer. Issue #52 will let GREEN complete production code instead of copying it, so GREEN would write code without the project conventions unless they are delivered. The specifications also described a coordinator learnings memory, a run-start pre-seed, and per-dispatch learnings injection that no card ever performed.

## What Changes

- The apply coordinator reads the `**Stack**`, `**Conventions**`, and `**Avoid**` fields of `## Implementation Context` in `tasks.md` once at run start and puts them, headed `Writing profile`, in every RED, GREEN, and green-exception task disclosure, replacement workers and recovery dispatches included.
- The `**Test Command**` field is never delivered to apply workers; each worker keeps the commands of its Step.
- When `tasks.md` or the three fields are absent or empty, the coordinator dispatches without the profile, with no error and no notice.
- `sai/commands/apply/worker-common.md` states the usage rule once: the profile says how to write, not what to write; the Step prevails on contradiction; the profile never widens the allowed files and never lifts a role prohibition.
- The RED worker's blindness rule names the writing profile as a permitted input; the profile holds no GREEN body.
- Every dispatching routing file under `sai/commands/apply/steps/` lists the writing profile in its task disclosure.
- The Direct Build implementer reads the root `SAI_LEARNINGS.md` once, when it exists, as context about the repository. It adds no requirement, scope, or file; the block prevails on contradiction; entries that cite missing paths are ignored; the implementer never corrects or writes the file; an absent file causes no error and no notice.
- `/sai-2-design` no longer lists `SAI_LEARNINGS.md` in `## Required Documentation`, even when consulted, because the profile is its delivery channel.
- The design `**Test Command**` rule now states that `/sai-3-implement` copies the field into the plan's runnable commands, replacing the stale sentence about verbatim injection into the blind test-writer dispatch.
- The apply terminal promotion pass no longer discloses contradicted pre-seeded keys, because nothing pre-seeds.
- The coordinator learnings memory, the run-start pre-seed, and per-dispatch learnings injection are retired from the specifications instead of being built.
- `GLOSSARY.md` states that the coordinator hands RED and GREEN the same writing profile and relays nothing between them.
- Two tests pin the new card text: every dispatching routing file delivers the writing profile, and the learnings memory wording is gone.

Known limitations accepted with this change:

- A Step does not benefit from what an earlier Step of the same run learned; the cost is bounded by the existing three-attempt budget per Step.
- Learnings discovered in a run reach workers only in a later change, after promotion to `SAI_LEARNINGS.md` and the next design merge.
- The Direct Build implementer reads unfiltered entries, including stale ones, and judges relevance itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply-step-delegation`: every Step disclosure carries the writing profile; no dispatch carries coordinator-chosen technical learnings.
- `apply`: the Step dispatch names the writing profile instead of relevant technical learnings.
- `apply-routed-card-set`: the coordinator responsibility list no longer includes a learnings memory.
- `apply-subagent-report-contract`: report field 6 keeps its meaning and no longer cross-references the retired learnings-memory capability.
- `apply-technical-learnings-memory`: retired; all three requirements are removed.
- `sai-learnings-consumption`: the run-start pre-seed is removed; the Test Command rule and the blindness invariant are restated without direct injection.
- `sai-learnings-file`: the silent no-op for an absent file covers apply without a memory and the Direct Build implementer.
- `sai-learnings-promotion`: field-6 learnings remain a supplementary promotion source, read from the run's worker reports rather than from a memory.
- `auto-fast-implement-worker`: the Direct Build implementer reads the learnings file as repository context.
- `tasks-required-documentation`: `## Required Documentation` never lists the learnings file.

## Impact

Modified files:

- `GLOSSARY.md`
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/red-worker.md`
- `sai/commands/apply/worker-common.md`
- `sai/commands/apply/steps/routing-green-direct.md`
- `sai/commands/apply/steps/routing-green-exception-no-production.md`
- `sai/commands/apply/steps/routing-green-exception-test-only.md`
- `sai/commands/apply/steps/routing-split-flow.md`
- `sai/commands/apply/steps/terminal-lifecycle.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/explore/direct-build-worker.md`
- `test/apply-routed-architecture.test.js`

New files: none.

The change is card text plus tests. The cards are shared, so Claude Code and opencode behave identically. `sai/tools/apply-step.js`, the install manifest, the command wrappers, and the capability profiles are untouched.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Originating issue: https://github.com/mmadariaga/shared-ai/issues/40. Related: issue #52 (https://github.com/mmadariaga/shared-ai/issues/52) lets GREEN complete production code and raises the value of this delivery; issues #49 and #50 are closed and already changed how design curates `## Required Documentation` and how `/sai-3-implement` reads it.

Future scope, outside this change: a within-run relay of report field 6 between Steps can be added later on top of the existing field if runs show Steps repeating the same discovery; whether Direct Build should contribute entries to `SAI_LEARNINGS.md` is a separate question. The cap of 5 Conventions was sized for a planner that also researches on its own; it may prove tight for a GREEN that completes code, and this was not measured. The size of the profile in a typical change was not measured either.

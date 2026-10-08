> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Installable files are copied into other projects, where shared-ai's own `openspec/specs/` directory does not exist. A citation of a shared-ai capability spec in such a file is therefore a pointer to a missing file. This caused a real stop: in an opencode `/sai-build` run in another project, `sai/commands/design/steps/tasks.md` told the design worker to reference two shared-ai spec paths, the worker listed them as Required Documentation, the planning worker could not find them, and the run stopped on a question.

The spec is shared-ai's requirement record. The installed prompt is the only source a worker has at run time, so every rule the worker needs must be written in an installable file.

## What Changes

- Removed every citation of a shared-ai capability spec, by path or by capability name, from the installable files:
  - `sai/commands/design/steps/tasks.md`: the routing derivation now points at its own pattern lists, states the closed-vocabulary rule in place (pick the closest listed token, `cross-cutting` also valid for `layer`, flag the gap in `design.md` Open Questions), and no longer names three capabilities or asks the worker to reference two spec files.
  - `sai/commands/design/steps/design.md`: the change-token format is no longer attributed to a capability.
  - `sai/commands/design/steps/overview.md`: the two spec paths are gone, and the five `overview.state` values (`unmaterialized`, `materializing`, `failed`, `current`, `stale`) plus the absent-key reading are now written in the step.
  - `sai/commands/implement/steps/audit-ingestion.md`: the clause declaring a spec normative is gone.
  - `sai/commands/apply/coordinator.md`, `sai/commands/archive/archive-commit-gate.instructions.md`, `sai/commands/meta-build/coordinator.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/commands/explore/steps/route-selector.md`, `sai/policies/artifact-feedback-gate.md`: citations deleted or reworded; the rule beside each one is unchanged.
  - `openspec/schemas/sai-workflow/templates/proposal.md`: the re-anchor clause carrying a spec path is removed from the first-line comment.
  - `sai/tools/file-manifest.js`: the header comment no longer names a capability.
- `sai/commands/implement/steps/decision-record-index.md` now states the rules that previously existed only in a spec: the five domain-unit noun rules with their precedence, the tie-break to the earlier rule, the fallback chain ending at `domain unit`, the cross-cutting thresholds (2, 8, and the advisory 8–12 range), the relationship family boundary, and the five index-output invariants. The "referenced by name, not restated" phrases are removed.
- `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md` keep naming the dispatch-safety invariant as the containing rule and now state it in one sentence, with no spec path.
- Added `test/installable-spec-citations.test.js`, a regression guard that walks the five installable source folders and fails, with file and line, on a `specs/<name>/` path naming a real shared-ai capability directory or on a backticked capability name followed by the word `capability` or `spec`.
- Recorded the rule in `AGENTS.md` (item 5 under "Add / modify an instruction") and as one new `## Avoid` entry in `SAI_LEARNINGS.md`.

Known limitations:

- The guard does not catch a bare capability name written without the word `capability` or `spec`; those cases rely on review and on the recorded rule.
- A future example path whose name later becomes a real capability will fail the guard and need rewording to a generic placeholder.
- Inside shared-ai, the design worker no longer reaches spec-only content through the removed pointers.
- `decision-record-index.md` is longer by the restated rules, and those rules now exist in two places that must be kept equal.

Boundaries kept: references to the target project's own specs (`openspec/specs/{name}/spec.md`, `specs/<capability>/spec.md`, `openspec/specs/**`) are untouched; no shared-ai spec is deleted or emptied; command wrappers under `commands/claude/` and `commands/opencode/` are unchanged; the Claude Code budget skills are unchanged.

## Capabilities

### New Capabilities

- `self-contained-installable-prompts`: installable files cite no shared-ai capability spec and state the rules their reader needs in installable text; the rule is recorded in the repository guidance.
- `installable-spec-citation-guard`: a regression test over the installable source folders that fails on a citation of a shared-ai capability spec.

### Modified Capabilities

- `decision-record-index-machinery`: the framework mapping list, fallback noun, and threshold values stay defined by the spec and are now also restated in the installed step file, which is what the cold build reads at run time.

## Impact

New files:

- `test/installable-spec-citations.test.js`

Modified files:

- `AGENTS.md`
- `SAI_LEARNINGS.md`
- `openspec/schemas/sai-workflow/templates/proposal.md`
- `sai/commands/apply/coordinator.md`
- `sai/commands/archive/archive-commit-gate.instructions.md`
- `sai/commands/design/steps/design.md`
- `sai/commands/design/steps/overview.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/explore/steps/pipeline-plan-unattended.md`
- `sai/commands/explore/steps/route-selector.md`
- `sai/commands/implement/steps/audit-ingestion.md`
- `sai/commands/implement/steps/decision-record-index.md`
- `sai/commands/meta-build/coordinator.md`
- `sai/policies/artifact-feedback-gate.md`
- `sai/tools/file-manifest.js`
- `skills/opencode/budget-executor/SKILL.md`
- `skills/opencode/budget-explorer/SKILL.md`
- `skills/opencode/budget-subagent/SKILL.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Line numbers in this block are locators taken on 2026-10-08; locate each passage by its content.

Draft of the `SAI_LEARNINGS.md` entry agreed in conversation, to be placed under `## Avoid` with this change's name on the Observed line:

- **openspec/specs/ citations in installable prompts**: Files that install into other projects (`sai/`, `skills/`, `agents/`, `commands/`, `openspec/schemas/sai-workflow/`) must not cite a shared-ai capability spec, by `openspec/specs/<name>/` path or by capability name, as something to read or reference: that directory exists only in this repository. State the rule in the prompt itself; the spec stays the requirement record, not a runtime source.
  *Observed:* self-contained-installable-prompts — `sai/commands/design/steps/tasks.md` told the design worker to reference two shared-ai spec paths; in another project the worker listed them as Required Documentation, the planning worker could not find them, and `/sai-build` stopped on a question.

Future context, outside this change:
- The frontend two-step split (`ui-ux` then `app-code`) is the only behavior-changing rule of `tasks-routing-metadata` absent from the design step. It was left out because nothing consumes the `**Routing**` line yet; adding it later is about three lines in the routing derivation.
- Reading `SAI_LEARNINGS.md` from Direct Build and `/sai-3-implement` is tracked in https://github.com/mmadariaga/shared-ai/issues/40.
- Resuming a cancelled planning worker was analyzed and left undecided. The recommendation on the table is a general command-runner rule that refuses the resume and names the relaunch command, plus stop-option wording that says a stop closes the run.

Not verified during exploration: whether `overview.md` enumerates the five `overview.state` values, whether `ddr-index.template.md` mirrors the ADR template's thresholds, and a rule-by-rule comparison of the two `change-overview` specs against `overview.md`.

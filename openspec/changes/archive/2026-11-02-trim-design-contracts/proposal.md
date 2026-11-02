> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Several `/sai-2-design` promises were not honored downstream. Routing difficulty was promised to `/sai-3-implement`, and Stack, Conventions, and Avoid were promised to the implementers, but the step brief never carried them, so mistakes recorded in `SAI_LEARNINGS.md` never reached GREEN. The Provenance marker promised to protect user decisions while `/sai-3-implement` could override any plan item "whenever that is cheaper", and no command created the ADR/DDR records that `**Record family**` classified. The Architecture Snapshot had no reader: the user reads `change-overview.md`, which excludes it.

## What Changes

- **Design contracts trimmed.** The design step, the `design.md` template, and the design coordinator's closing print drop the Architecture Snapshot; `## Target State` keeps its finished-shape artifact and one `### File Manifest` subsection, and `sai/tools/file-manifest.js` creates a missing manifest at the end of Target State (after a snapshot that an older design still carries). The `**Provenance**` decision marker is removed from the design step and template. `tasks.md`'s `## Implementation Context` keeps only **Test Command**; Stack, Conventions, and Avoid, with their merge, precedence, and contradiction-notice rules, are removed. Commit atomicity is reduced to two rules: one RED/GREEN/review/commit cycle per Step, and a contract-breaking change travels with all its callers, tests included. The Routing `difficulty` bullet states that it is reserved for future GREEN routing and has no consumer today.
- **Learnings loop repaired.** The design research step, the RED and GREEN steps, and the review's Consistency with Codebase pass read the root `SAI_LEARNINGS.md` directly when it exists; the implement step brief carries its path. An entry wins over contradicting code: code in a file the step modifies is corrected, and code outside the change is reported. When an entry fails on execution, the implement close corrects or deletes it and writes the correction to a `## Learnings Corrections` section of the change's `design.md`. `sai/policies/sai-learnings-format.md` gains § Consumption and replaces the supersede-only rule with evidence-backed correction and deletion.
- **Plan departures bounded.** `/sai-3-implement` departs from the plan only when execution shows that following it does not work (the plan contradicts the code or the tests, a planned signature or file does not fit, a step cannot close as grouped, or two artifacts contradict each other); saving work is not a reason, and every deviation is reported with its reason.
- **Decision records created.** The new `sai/policies/decision-record-creation.md` is the single source for creating the records design classifies: a directly invoked `/sai-3-implement` at its completed close in its own local commit, `/sai-build` at its own close (its implement segments create none), the completed fix segment of `/sai-deep-review`, and the Direct Build ADR/DDR pass, whose implementer writes the records inside the route's single commit. Records are numbered from the decision-record inventory, a missing folder or index is created from the family's index template, a decision already cited is skipped, and ignored paths stay uncommitted.
- **References updated.** `GLOSSARY.md`, `AGENTS.md`, `README.md`, `sai/SAI_AGENTS.md`, the command docs, `sai/policies/step-contract-format.md`, `sai/policies/adr-ddr-criteria.md`, `sai/commands/design/change-overview.md`, and the design and implement contract tests follow the new contracts.
- Scope drift (not an implementation error): the review's Documentation & Migrations pass no longer reports a missing record for a decision that carries `**Record family**`. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): the design coordinator no longer copies `design.md` to `previous-design.md` in the run directory. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): the `sai/SAI_AGENTS.md` ADR and DDR index entries name the implementing commands' closing step as an index writer. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `decision-record-creation`: which command creates the ADR/DDR records that design classifies, when, and how they are numbered, laid out, indexed, committed, and reported.

### Modified Capabilities

- `design-decision-provenance`: retired; every requirement is removed.
- `design-target-state`: Target State holds only File Manifest; the Architecture Snapshot requirements are removed.
- `change-overview-artifact`: design keeps no Architecture Snapshot; the overview still excludes one in an older design.
- `design-file-manifest-tool`: a missing manifest is created at the end of Target State.
- `design-interfaces-artifact`: Target State carries no Architecture Snapshot.
- `design-behavioral-parity`: no path emits a provenance marker.
- `design-steps-library`: the learnings format loads in the research step.
- `sai-workflow-schema`: the design and tasks templates drop the retired fields.
- `localized-overview-generation`: the structural label example names Record family instead of Provenance.
- `plan-spec-design-segments`: the design segment no longer prints an Architecture Snapshot.
- `tasks-implementation-context`: Implementation Context keeps only Test Command.
- `tasks-required-documentation`: the learnings file is omitted because the step brief carries its path.
- `tasks-routing-metadata`: difficulty is reserved for future GREEN routing.
- `atomic-commit-planning`: commit atomicity is reduced to two rules.
- `sai-learnings-consumption`: design, RED, GREEN, and review read the file directly; entries win over code; execution settles a stale entry.
- `sai-learnings-file`: the four sections no longer mirror Implementation Context; correction and deletion need execution evidence.
- `implement-new-loop`: the step brief carries the learnings path, plan departures need execution evidence, and the coordinator loads the decision-record policy.
- `implement-new-run-log`: the run-close learnings step corrects and deletes stale entries and records them in `design.md`.
- `deep-review-command`: the completed fix segment adds one decision-record commit.
- `adr-creation-decision`: the culture gate and approval question are removed; the already-recorded check uses the record's provenance citation.

## Impact

New files:
- `sai/policies/decision-record-creation.md`

Modified files:
- `AGENTS.md`
- `GLOSSARY.md`
- `README.md`
- `docs/commands/sai-2-design.md`
- `docs/commands/sai-3-implement.md`
- `docs/commands/sai-build.md`
- `docs/commands/sai-deep-review.md`
- `docs/commands/sai-explore.md`
- `openspec/schemas/sai-workflow/templates/design.md`
- `openspec/schemas/sai-workflow/templates/tasks.md`
- `sai/SAI_AGENTS.md`
- `sai/commands/build/coordinator.md`
- `sai/commands/deep-review/coordinator.md`
- `sai/commands/design/change-overview.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/steps/design.md`
- `sai/commands/design/steps/research.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/explore/direct-build-worker.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/steps/green-step.md`
- `sai/commands/implement/steps/red-step.md`
- `sai/commands/review/steps/resolve-review-analysis.md`
- `sai/policies/adr-ddr-criteria.md`
- `sai/policies/sai-learnings-format.md`
- `sai/policies/step-contract-format.md`
- `sai/tools/file-manifest.js`
- `test/change-overview-contract.test.js`
- `test/design-coordinator-worker.test.js`
- `test/file-manifest-tool.test.js`
- `test/implement-family.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Future scope, outside this change: `/sai-3-implement` may later route Steps to different GREEN workers by the Routing `difficulty`, which requires changing the one-GREEN-per-run lifecycle. A project setting that turns on change-overview.md generation without passing --overview-lang may be proposed separately.

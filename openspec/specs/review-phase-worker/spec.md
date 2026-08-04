# review-phase-worker Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.
## Requirements
### Requirement: Review worker owns the complete technical workflow

The review worker SHALL own envelope parsing, prerequisite checks, change resolution, parent-branch detection, diff scoping, review passes 1–10, Pass 11 mutation analysis, report generation, report verification, and the lifecycle summary. The coordinator SHALL not share ownership of these activities.

#### Scenario: Worker starts from an invocation envelope
- **WHEN** a review worker receives `wrapper_echo_value` and `arguments_value`
- **THEN** it performs the complete review workflow from those values and durable repository state
- **AND** it returns paths and summaries rather than artifact contents through its lifecycle payload

### Requirement: Technical workflow is loaded through the shared review invocation core

The routed review worker and the inline review caller SHALL load and follow `sai/commands/review/invocation.md` as the shared technical core. That core SHALL load the budget skill, glossary format, `sai/instructions/review.md`, and `sai/policies/remember.md`; it SHALL own none of the prerequisite parsing, change selection, coordinator lifecycle, or terminal navigation.

#### Scenario: Routed worker starts technical review
- **WHEN** the routed review worker begins technical work
- **THEN** it loads the shared review invocation core before executing review instructions
- **AND** it does not create a routed-only copy of the review instruction-loading sequence

#### Scenario: Inline caller starts review
- **WHEN** the Copilot inline review path starts
- **THEN** it uses the same review invocation core and review instruction source
- **AND** the inline path remains behaviorally aligned with the routed worker

#### Scenario: Inline caller retains lifecycle ownership
- **WHEN** `sai/commands/sai-5-review.md` consumes the shared review invocation core
- **THEN** that inline caller still owns prerequisite checks, change-picker invocation, and the exact terminal stop `Review done.`
- **AND** the invocation core does not take ownership of those lifecycle responsibilities

### Requirement: Prerequisite failures stop technical work

Before review analysis, the worker SHALL enforce the existing OpenSpec CLI, `openspec/` directory, `schema: sai-workflow`, and required `proposal.md` prerequisites. A failed prerequisite SHALL return the existing actionable failure and SHALL not write `review.md`, mutate production files, or dispatch nested review subagents. For a missing proposal, the failure summary SHALL be exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`.

#### Scenario: Required proposal is missing
- **WHEN** `openspec/changes/{change-name}/proposal.md` cannot be found
- **THEN** the worker returns a failed lifecycle result with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`
- **AND** it performs no review analysis or mutation pass

### Requirement: Change resolution preserves wrapper precedence

The worker SHALL parse the resolved argument string as up to two positional values: the first token is the change name and the remaining token is the optional parent branch. It SHALL resolve a non-empty wrapper-echo value before `$ARGUMENTS`; when neither supplies a name, it SHALL preserve the existing zero/one/multiple active-change picker behavior and CLI order. Empty or whitespace-only wrapper-echo values SHALL fall through to normal argument or picker resolution.

#### Scenario: Wrapper echo contains a change name
- **WHEN** the wrapper echo is non-empty after trimming
- **THEN** the worker parses its first token as the change name and an optional second token as the parent branch
- **AND** it uses that change name without running the active-change picker

#### Scenario: Explicit change and parent branch are supplied
- **WHEN** the resolved argument string is `my-change develop`
- **THEN** the worker resolves `my-change` as the change name
- **AND** it carries `develop` into parent-branch detection without treating it as part of the change name

#### Scenario: Multiple active changes exist
- **WHEN** no explicit change name is available and the OpenSpec listing contains multiple changes
- **THEN** the worker requests a selection with options in CLI-preserved order
- **AND** it does not resolve a name until the user selects one of those options

### Requirement: Parent branch and diff scope remain unchanged

The worker SHALL detect the parent branch in the existing order: user-provided branch, remote default branch, then verified `master` and `main`. It SHALL state the selected parent branch, compute the `{parent}...HEAD` name-status, stat, commit map, and diff, enforce the existing 500-LOC full-diff threshold and eight-call maximum for `budget-explorer` delegation, and terminate with exactly `No changes detected against {parent-branch}. Nothing to review.` when the diff is empty.

#### Scenario: Parent branch is inferred
- **WHEN** the user does not provide a parent branch
- **THEN** the worker tries the remote default branch before verified `master` and `main`
- **AND** the selected branch is included in the worker-authored terminal summary

#### Scenario: Diff exceeds the direct-review threshold
- **WHEN** the scoped diff exceeds 500 LOC
- **THEN** the worker does not load the full diff into the main review context
- **AND** it delegates per-file or logical-group inspection to read-only `budget-explorer` branches within the existing maximum

### Requirement: Passes 1 through 10 preserve the existing review policy

The worker SHALL execute the existing passes 1–10 against the full diff and change artifacts, preserving domain alignment, correctness, security triage, performance triage, accessibility triage, maintainability, testing, codebase consistency, glossary language consistency, and documentation/migration review. Security, performance, and accessibility remain triage-only in this phase.

#### Scenario: UI and security surfaces are touched
- **WHEN** the diff touches a security surface or UI surface
- **THEN** the worker records the existing triage result and corresponding audit recommendation
- **AND** it does not run SAST, profiling, axe, Lighthouse, or a deep accessibility audit as part of review

### Requirement: Pass 11 keeps its activation and mutation scope

The worker SHALL run Pass 11 only when the diff contains testable production code and the repository contains at least one test file. When either condition is false, it SHALL record exactly `Mutation Analysis (Pass 11): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` using the applicable reason and emit no mutation findings. An undetermined test command is a separate Tier-2 detection outcome, not an activation-gate reason. Eligible mutation targets SHALL be exactly changed production-code files in the diff.

#### Scenario: Activation gate is not satisfied
- **WHEN** the diff has no testable production code or the repository has no test file
- **THEN** Pass 11 is skipped with exactly `Mutation Analysis (Pass 11): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` using the applicable reason
- **AND** no production file is mutated

#### Scenario: Activation gate is satisfied
- **WHEN** both testable changed production code and at least one repository test file exist
- **THEN** Pass 11 proceeds with only changed production-code files as mutation targets
- **AND** no file outside the diff is selected

### Requirement: Pass 11 preserves two-tier detection and safety

The worker SHALL prefer a declared supported mutation tool and skip the LLM-as-mutator path when one is available. Otherwise it SHALL detect the project test command, run a passing baseline, and enforce the existing per-mutation 60-second timeout, dirty-file pre-check, file-scoped `git checkout -- {file}` revert, and revert verification. It SHALL record exactly one outcome for every selected mutation. An observed `revert-failed` result from a completed subagent batch SHALL continue subsequent sequential batches; a `revert-failed`-equivalent classification caused by missing subagent output SHALL halt later batch dispatch because the distinction is the unverified cause, not the shared safety label.

#### Scenario: Declared mutation tooling exists
- **WHEN** a supported mutation tool is declared in the project manifest
- **THEN** the worker runs that tool and parses surviving mutants
- **AND** it does not dispatch the LLM-as-mutator path

#### Scenario: Baseline tests fail
- **WHEN** no declared mutation tool exists and the detected baseline test command fails
- **THEN** the worker records the baseline failure and applies no LLM mutation
- **AND** it emits no mutation findings

#### Scenario: No Tier-2 test command is detected
- **WHEN** Pass 11 is activated, no supported mutation tool is declared, and no test command can be detected from the project manifests
- **THEN** the worker records that `mutation analysis could not run due to an undetermined test command` in `review.md`
- **AND** it emits no mutation findings and stops Pass 11 without applying mutations

#### Scenario: A mutation revert fails
- **WHEN** file-scoped revert verification finds the mutated file still dirty
- **THEN** the worker records that mutation as `revert-failed` and emits the existing Blocker and working-tree-pollution warning
- **AND** it continues subsequent sequential batches

### Requirement: Pass 11 authorizes sequential write-capable mutation dispatch

For the LLM-as-mutator path, the worker SHALL decide mutation targets and mutation definitions itself and SHALL delegate only mechanical apply/test/revert/verify I/O to `budget-subagent`. It SHALL dispatch batches sequentially, with at most 5–6 mutations per batch, and SHALL require one outcome for every assigned mutation. The aggregate outcome counts SHALL equal the total selected mutations. If a batch omits an outcome, the worker SHALL classify every unaccounted mutation as `revert-failed`-equivalent and count it as `revert-failed` for safety accounting, record the discrepancy in `review.md`, emit the existing critical working-tree-pollution warning, stop dispatching further mutation batches, and complete the report with the discrepancy rather than waiting indefinitely.

#### Scenario: Multiple mutation batches exist
- **WHEN** more than one mutation batch is needed
- **THEN** the worker dispatches the batches sequentially
- **AND** it never runs concurrent working-tree mutation branches

#### Scenario: A batch omits a result
- **WHEN** a mutation subagent returns fewer outcomes than assigned mutations
- **THEN** the worker records every missing mutation as `revert-failed`-equivalent, counts it as `revert-failed`, includes the discrepancy in `review.md`, and emits the existing critical working-tree-pollution warning
- **AND** it stops later mutation-batch dispatches and completes with the discrepancy instead of leaving an unresolved lifecycle state

### Requirement: Worker writes and verifies only the review artifact

The worker SHALL write `openspec/changes/{change-name}/review.md` using the existing review report template, including findings, severity roll-up, coverage, Pass 11 outcomes, and all three audit recommendations. The completed payload's `summary` SHALL contain the complete existing `## Recommended Audits` block, including all three audit lines, as worker-authored text. Outside the explicitly bounded and reverted Pass 11 mutations, it SHALL never modify production code or any other durable artifact, and it SHALL never leave a production file persistently changed. `changed_files` SHALL contain only durable writes by the worker: `review.md`, plus any production file whose revert failed or whose revert result was unaccounted and therefore safety-classified as revert-failed-equivalent; cleanly reverted mutation targets SHALL be excluded.

#### Scenario: Review report is generated
- **WHEN** all review passes and any active mutation analysis are complete
- **THEN** `review.md` exists, is non-empty, and contains the required review sections and audit recommendations
- **AND** the completed payload reports the canonical change name and only the durable paths defined above

#### Scenario: Worker returns completion
- **WHEN** `review.md` is verified from disk
- **THEN** the worker returns `completed` with severity counts, top three Blockers when present, report path, the complete worker-authored `## Recommended Audits` block, and parent-branch statement
- **AND** it returns no report contents in the lifecycle payload


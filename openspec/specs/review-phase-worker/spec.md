# review-phase-worker Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.

## Requirements

### Requirement: Review worker owns the complete technical workflow

The review worker SHALL own envelope parsing, prerequisite checks, change resolution, parent-branch detection, diff scoping, review passes 1–11, Pass 12 mutation analysis, report generation, report verification, and the lifecycle summary. The coordinator SHALL not share ownership of these activities.

#### Scenario: Worker starts from an invocation envelope
- **WHEN** a review worker receives `arguments_value`
- **THEN** it performs the complete review workflow from that value and durable repository state
- **AND** it returns paths and summaries rather than artifact contents through its lifecycle payload

### Requirement: Technical workflow is loaded through the review step library

The routed review worker SHALL load its technical workflow step-gated. The worker contract plus `sai/commands/review/steps/common.md` SHALL form the sealed initial surface loaded at dispatch, carrying the boundaries that outlive any single step (budget skill, glossary format, and remember-policy loads, input paths, communication mode, prerequisites, collaboration style, hard rules), and all remaining instruction mass SHALL arrive just-in-time via coordinator `Active step:` pointer lines naming the files under `sai/commands/review/steps/`. The worker contract SHALL NOT restate step-file content. The former monolithic `sai/commands/review/instructions.md` and the invocation core `sai/commands/review/invocation.md` are retired: the step library is the only review instruction surface, and the install manifest retires installed copies of both.

#### Scenario: Routed worker starts technical review

- **WHEN** the routed review worker begins technical work
- **THEN** it holds only the worker contract plus `steps/common.md` as its initial instruction surface and receives every remaining phase instruction through coordinator-named step files

#### Scenario: Monolith is retired

- **WHEN** the step-gated review delivery is in force
- **THEN** neither `sai/commands/review/instructions.md` nor `sai/commands/review/invocation.md` exists, and the install manifest carries a retirement for each installed copy

### Requirement: Prerequisite failures stop technical work

Before review analysis, the worker SHALL enforce the existing OpenSpec CLI, `openspec/` directory, `schema: sai-workflow`, and required `proposal.md` prerequisites. A failed prerequisite SHALL return the existing actionable failure and SHALL not write `review.md`, mutate production files, or dispatch nested review subagents. For a missing proposal, the failure summary SHALL be exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`.

#### Scenario: Required proposal is missing
- **WHEN** `openspec/changes/{change-name}/proposal.md` cannot be found
- **THEN** the worker returns a failed lifecycle result with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`
- **AND** it performs no review analysis or mutation pass

### Requirement: Change resolution parses positional arguments

The worker SHALL parse the resolved `arguments_value` as up to two positional values: the first token is the change name and the remaining token is the optional parent branch. It SHALL resolve a non-empty value before invoking the active-change picker; when no name is supplied, it SHALL preserve the existing zero/one/multiple picker behavior and CLI order. No wrapper-echo source or wrapper precedence exists.

#### Scenario: Explicit change and parent branch are supplied
- **WHEN** the resolved argument string is `my-change develop`
- **THEN** the worker resolves `my-change` as the change name
- **AND** it carries `develop` into parent-branch detection without treating it as part of the change name

#### Scenario: Multiple active changes exist
- **WHEN** no explicit change name is available and the OpenSpec listing contains multiple changes
- **THEN** the worker requests a selection with options in CLI-preserved order
- **AND** it does not resolve a name until the user selects one of those options

### Requirement: Parent branch and diff scope remain unchanged

The worker SHALL detect the parent branch as the first candidate that verifies, in the existing order: user-provided branch, remote default branch, `master`, then `main`; when no candidate verifies it SHALL return `failed` naming the candidates tried. It SHALL check the name-status for an empty diff before reading change artifacts or loading the diff. It SHALL state the selected parent branch, compute the `{parent}...HEAD` name-status, stat, commit map, and diff, enforce the existing 500-LOC full-diff threshold and eight-call maximum for `budget-explorer` delegation, and terminate with exactly `No changes detected against {parent-branch}. Nothing to review.` when the diff is empty.

#### Scenario: Parent branch is inferred
- **WHEN** the user does not provide a parent branch
- **THEN** the worker tries the remote default branch before verified `master` and `main`
- **AND** the selected branch is included in the worker-authored terminal summary

#### Scenario: Diff exceeds the direct-review threshold
- **WHEN** the scoped diff exceeds 500 LOC
- **THEN** the worker does not load the full diff into the main review context
- **AND** it delegates per-file or logical-group inspection to read-only `budget-explorer` branches within the existing maximum

#### Scenario: No parent-branch candidate verifies
- **WHEN** neither the supplied branch, the remote default, `master`, nor `main` verifies
- **THEN** the worker returns `failed` naming the candidates tried and computes no diff

### Requirement: Passes 1 through 11 preserve the existing review policy

The worker SHALL execute passes 1–11 against the full diff and change artifacts, preserving domain alignment, correctness, security triage, performance triage, accessibility triage, maintainability, testing, codebase consistency, glossary language consistency, documentation/migration review, and the dedicated Resilience pass. Security, performance, and accessibility remain triage-only in this phase.

#### Scenario: UI and security surfaces are touched
- **WHEN** the diff touches a security surface or UI surface
- **THEN** the worker records the existing triage result and corresponding audit recommendation
- **AND** it does not run SAST, profiling, axe, Lighthouse, or a deep accessibility audit as part of review

### Requirement: Pass 12 keeps its activation and mutation scope

The worker SHALL run Pass 12 only when the diff contains testable production code and the repository contains at least one test file. When either condition is false, it SHALL record exactly `Mutation Analysis (Pass 12): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` using the applicable reason and emit no mutation findings. Eligible mutation targets SHALL be exactly changed production-code files in the diff.

#### Scenario: Activation gate is not satisfied
- **WHEN** the diff has no testable production code or the repository has no test file
- **THEN** Pass 12 is skipped with exactly `Mutation Analysis (Pass 12): skipped — {no testable production code in diff | repository has no test files}. No mutation findings.` using the applicable reason
- **AND** no production file is mutated

#### Scenario: Activation gate is satisfied
- **WHEN** both testable changed production code and at least one repository test file exist
- **THEN** Pass 12 proceeds with only changed production-code files as mutation targets
- **AND** no file outside the diff is selected

### Requirement: Pass 12 handles empty eligible-target sets

The review worker SHALL distinguish an admitted Pass 12 activation gate from an empty eligible mutation-target set and SHALL emit the exact no-eligible-target skip without inferred findings.

#### Scenario: Mutation scope is empty after activation

- **WHEN** the activation gate admits Pass 12 but no changed production-code file is eligible for mutation
- **THEN** the worker records `Mutation Analysis (Pass 12): skipped — no eligible mutation targets. No mutation findings.` and continues the review.

### Requirement: Pass 12 runs only the declared deterministic engine

The worker SHALL run Pass 12 only through a supported mutation tool declared as a project dependency, with its checked-in configuration, scoped to the eligible diff files; the engine owns baseline, mutation application, timeout, revert, and result collection. With no declared tool, a failed baseline, a failed execution, or an unparseable report, the worker SHALL record the matching exact `unavailable` note and emit no mutation findings. It SHALL never apply a hand-authored or inferred mutation.

#### Scenario: Declared mutation tooling exists
- **WHEN** a supported mutation tool is declared in the project manifest
- **THEN** the worker runs that tool against the eligible diff files and parses its report

#### Scenario: No mutation tool is declared
- **WHEN** Pass 12 is activated and no supported mutation tool is declared
- **THEN** the worker records `Mutation Analysis (Pass 12): unavailable — no deterministic mutation tool declared. No mutation findings.` and mutates nothing

### Requirement: Worker writes and verifies only the review artifact

The worker SHALL write `openspec/changes/{change-name}/review.md` using the existing review report template, including findings with severity-prefixed identifiers, severity roll-up, the closing `Summary:` tally line, coverage, Pass 12 outcomes, and all three audit recommendations. The completed payload's `summary` SHALL contain the complete existing `## Recommended Audits` block, including all three audit lines, as worker-authored text. Outside the explicitly bounded and reverted Pass 12 mutations, it SHALL never modify production code or any other durable artifact, and it SHALL never leave a production file persistently changed. `changed_files` SHALL contain only durable writes by the worker: `review.md`, plus any production file whose revert failed or whose revert result was unaccounted and therefore safety-classified as revert-failed-equivalent; cleanly reverted mutation targets SHALL be excluded.

#### Scenario: Review report is generated
- **WHEN** all review passes and any active mutation analysis are complete
- **THEN** `review.md` exists, is non-empty, and contains the required review sections, identifiers, summary tally, and audit recommendations
- **AND** the completed payload reports the canonical change name and only the durable paths defined above

#### Scenario: Worker returns completion
- **WHEN** `review.md` is verified from disk
- **THEN** the worker returns `completed` with severity counts, top three Critical findings when present, report path, the complete worker-authored `## Recommended Audits` block, and parent-branch statement
- **AND** it returns no report contents in the lifecycle payload

### Requirement: Review lifecycle results carry no time field

The review worker SHALL return progress and terminal lifecycle results with no time field, while retaining review passes, mutation analysis, report generation, and triage ownership; the validator's `validated_at` sidecar is the only observed time.

#### Scenario: Review reports a milestone
- **WHEN** a review milestone completes
- **THEN** its progress result carries the step ids and changed paths and no time field.

### Requirement: Review findings use the shared audit severity vocabulary

The review instruction and worker contract SHALL classify every finding with one of the shared severities `Critical`, `High`, `Medium`, or `Low`, or with the review-only `Question` category. `Critical` SHALL mean must-fix-before-merge (bugs, security holes, broken builds, contract violations, contradictions of the change artifacts); `High` SHALL mean should-fix-before-merge (significant maintainability, performance, or test-coverage issues that will hurt soon); `Medium` SHALL mean a moderate maintainability, performance, or test-coverage concern that does not threaten merge-readiness but should be addressed soon; `Low` SHALL mean nice-to-fix (naming, small refactors, low-impact polish); `Question` SHALL mean genuine uncertainty needing user input, used sparingly. The retired terms `Blocker`, `Major`, and `Minor` SHALL NOT be emitted by the review instruction, the review worker contract, or the review report. Every triage escalation in the review instruction SHALL reference the new levels: blatant security findings SHALL be raised as `Critical`, blatant performance and accessibility findings as `High` or `Critical`, and glossary deviations as `Low`.

#### Scenario: Severity classification uses the shared levels

- **WHEN** the review classifies a finding
- **THEN** the finding's severity is exactly one of `Critical`, `High`, `Medium`, or `Low`, or its category is `Question`
- **AND** none of the retired terms `Blocker`, `Major`, or `Minor` is emitted

#### Scenario: Triage escalations reference the shared levels

- **WHEN** the review instruction escalates a blatant security, performance, or accessibility issue during triage
- **THEN** it names the finding `Critical` or `High` as applicable
- **AND** it does not use the retired triage vocabulary

#### Scenario: Mutation findings fold into the report by remapped severity

- **WHEN** Pass 12 produced mutation findings
- **THEN** each surviving and pre-check-failed mutation is counted as `High` and each revert-failed mutation as `Critical` in the review counts and verdict
- **AND** their `mMUT-N` identifiers are unchanged

### Requirement: Review findings carry severity-prefixed identifiers and a closing summary tally

The review instruction SHALL assign every finding a severity-prefixed identifier: the severity's initial followed by the finding's sequence within that severity in the current report (`C1`, `H1`, `M1`, `L1`, and `Q1` for Questions), with the sequence restarting at 1 for each level at the start of every review. The review report SHALL close with a `Summary:` line in the form `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Questions=<count>` whose counts match the report's findings, including mutation findings folded in at their remapped severities. The worker contract's completion verification SHALL reference the top three `Critical` findings when present, never the retired `Blocker` term.

#### Scenario: Every finding carries an identifier

- **WHEN** the review report lists a finding
- **THEN** the finding heading leads with its severity-prefixed identifier
- **AND** identifiers restart at 1 per level per report

#### Scenario: Report closes with the summary tally

- **WHEN** the review report is complete
- **THEN** it closes with a `Summary:` line tallying `Critical`, `High`, `Medium`, `Low`, and `Questions` counts that match the listed findings
- **AND** the worker completion verification names the top three `Critical` findings when present

### Requirement: Review close runs a pre-save adversarial findings check
The review close step SHALL challenge the in-memory draft before saving to discard false positives and correct severity. Mutation findings (mMUT-N) come from the deterministic engine and SHALL stay outside the adversary at their mapped severity. It SHALL skip the adversary when the draft has no finding other than mMUT-N findings, otherwise dispatch exactly one budget-explorer subagent receiving only per-finding identifier, file:line, category, and one-line problem statement without diff or raw code, scope the adversary to the current diff findings only, require per-finding keep or discard or downgrade verdict with why under 40 words and total report under 800 words, let the worker accept or reject each verdict with discards invisible and tally recomputed over kept findings at final severity, and close with worker findings on subagent failure without blocking.
#### Scenario: Adversarial check filters review draft
- **WHEN** the in-memory review draft contains findings
- **THEN** the worker runs one bounded adversary and saves only kept findings with recomputed Summary tally

#### Scenario: Mutation findings bypass the adversary
- **WHEN** the draft carries mMUT-N findings
- **THEN** they are saved at their mapped severity without adversary review, and a draft whose only findings are mMUT-N skips the adversary

# review-phase-worker Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.

## Requirements

### Requirement: Review worker owns the complete technical workflow

The review worker SHALL own envelope parsing, change resolution, the required `proposal.md` gate, parent-branch detection, diff scoping, review passes 1–11 only, report generation, report verification, and the lifecycle summary. The coordinator SHALL not share ownership of these activities. OpenSpec environment prerequisite checks SHALL belong to `/sai-explore` alone and SHALL NOT be part of worker startup. Review SHALL NOT probe mutation engines, execute mutations, or emit mutation sections, outcomes, or identifiers.

#### Scenario: Worker starts from an invocation envelope
- **WHEN** a review worker receives `arguments_value`
- **THEN** it performs the complete review workflow from that value and durable repository state without running OpenSpec environment prerequisite checks
- **AND** it returns paths and summaries rather than artifact contents through its lifecycle payload

### Requirement: Technical workflow is loaded through the review step library

The routed review worker SHALL load its technical workflow step-gated. The worker contract plus `sai/commands/review/steps/common.md` SHALL form the sealed initial surface loaded at dispatch, carrying the boundaries that outlive any single step (`budget-ro` skill and remember-policy loads, input paths, communication mode, change resolution and proposal gate, collaboration style, hard rules), and all remaining instruction mass SHALL arrive just-in-time via coordinator `Active step:` pointer lines naming the files under `sai/commands/review/steps/`. The glossary format SHALL load only when pass 9 is reached and `GLOSSARY.md` exists at the repo root. The worker contract SHALL NOT restate step-file content. The former monolithic `sai/commands/review/instructions.md` and the invocation core `sai/commands/review/invocation.md` are retired: the step library is the only review instruction surface, and the install manifest retires installed copies of both.

#### Scenario: Routed worker starts technical review
- **WHEN** the routed review worker begins technical work
- **THEN** it holds only the worker contract plus `steps/common.md` as its initial instruction surface and receives every remaining phase instruction through coordinator-named step files

#### Scenario: Monolith is retired
- **WHEN** the step-gated review delivery is in force
- **THEN** neither `sai/commands/review/instructions.md` nor `sai/commands/review/invocation.md` exists, and the install manifest carries a retirement for each installed copy

#### Scenario: Project without a glossary
- **WHEN** the review reaches pass 9 in a project with no `GLOSSARY.md` at the repo root
- **THEN** the worker does not load `sai/policies/glossary-format.md` at any point of the run

### Requirement: Prerequisite failures stop technical work

Before review analysis, the worker SHALL enforce the required `proposal.md` and SHALL NOT run or restate the OpenSpec CLI, `openspec/` directory, or `schema: sai-workflow` prerequisite checks. A missing proposal SHALL return the existing actionable failure and SHALL not write `review.md`, mutate production files, or dispatch nested review subagents. For a missing proposal, the failure summary SHALL be exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`.

#### Scenario: Required proposal is missing
- **WHEN** `openspec/changes/{change-name}/proposal.md` cannot be found
- **THEN** the worker returns a failed lifecycle result with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`
- **AND** it performs no review analysis or mutation pass

### Requirement: Change resolution parses positional arguments

The worker SHALL parse the resolved `arguments_value` per `sai/commands/review/options.md`: an optional change name, then the declared options. The first token that does not start with `--` and is not an option's value is the change name, and the `--parent-branch` value is the optional parent branch. An unknown `--` option, an option missing its value, or a second positional value SHALL return `failed` before any resolution and name the token. A second positional value SHALL be answered with a message stating that the parent branch is passed as `--parent-branch <branch>`. The worker SHALL resolve a non-empty name before invoking the active-change picker. When no name is supplied, it SHALL preserve the existing zero/one/multiple picker behavior and CLI order. No wrapper-echo source or wrapper precedence exists.

#### Scenario: Explicit change and parent branch are supplied
- **WHEN** the resolved argument string is `my-change --parent-branch develop`
- **THEN** the worker resolves `my-change` as the change name
- **AND** it carries `develop` into parent-branch detection without treating it as part of the change name

#### Scenario: Multiple active changes exist
- **WHEN** no explicit change name is available and the OpenSpec listing contains multiple changes
- **THEN** the worker requests a selection with options in CLI-preserved order
- **AND** it does not resolve a name until the user selects one of those options

#### Scenario: Positional parent branch is rejected
- **WHEN** the resolved argument string is `my-change develop`
- **THEN** the worker returns `failed` naming `develop` and stating that the parent branch is passed as `--parent-branch <branch>`

### Requirement: Parent branch and diff scope remain unchanged

The worker SHALL detect the parent branch as the first candidate that verifies, in this order: the `--parent-branch` value, remote default branch, `master`, then `main`. When no candidate verifies, it SHALL return `failed` naming the candidates tried. It SHALL check the name-status for an empty diff before reading change artifacts or loading the diff. It SHALL state the selected parent branch and compute the `{parent}...HEAD` name-status, stat, commit map, and diff. It SHALL enforce the existing 500-LOC full-diff threshold and eight-call maximum for `budget-explorer` delegation. When the diff is empty, it SHALL terminate with exactly `No changes detected against {parent-branch}. Nothing to review.`

#### Scenario: Parent branch is inferred
- **WHEN** the user does not pass `--parent-branch`
- **THEN** the worker tries the remote default branch before verified `master` and `main`
- **AND** the selected branch is included in the worker-authored terminal summary

#### Scenario: Diff exceeds the direct-review threshold
- **WHEN** the scoped diff exceeds 500 LOC
- **THEN** the worker does not load the full diff into the main review context
- **AND** it delegates per-file or logical-group inspection to read-only `budget-explorer` branches within the existing maximum

#### Scenario: No parent-branch candidate verifies
- **WHEN** neither the `--parent-branch` value, the remote default, `master`, nor `main` verifies
- **THEN** the worker returns `failed` naming the candidates tried and computes no diff

### Requirement: Passes 1 through 11 preserve the existing review policy

The worker SHALL execute passes 1–11 against the full diff and change artifacts, preserving domain alignment, correctness, security triage, performance triage, accessibility triage, maintainability, testing, codebase consistency, glossary language consistency, documentation/migration review, and the dedicated Resilience pass. Security, performance, and accessibility remain triage-only in this phase.

#### Scenario: UI and security surfaces are touched
- **WHEN** the diff touches a security surface or UI surface
- **THEN** the worker records the existing triage result and corresponding audit recommendation
- **AND** it does not run SAST, profiling, axe, Lighthouse, or a deep accessibility audit as part of review

### Requirement: Worker writes and verifies only the review artifact

The worker SHALL write only `openspec/changes/{change-name}/review.md` using the command-owned template. The report SHALL carry one provenance line with the parent branch, commit range and date, the three surface-triage sections each with its `**Surface touched:**` line, the findings with severity-prefixed identifiers and titles in their headings, and the closing `Summary:` tally. It SHALL carry no Summary paragraph, Verdict, Findings count, Coverage Notes section, or `Resilience:` line. The close step SHALL be the single home of the verification before `completed`: it SHALL verify that `review.md` exists, is non-empty, carries an identifier on every finding, carries the three `Surface touched` lines, and closes with a `Summary:` tally whose counts match its findings. The worker card SHALL NOT list a separate verification. The completed payload's `summary` SHALL contain the complete existing `## Recommended Audits` block, including all three audit lines. The worker SHALL NOT modify production code or any other artifact. `changed_files` SHALL contain only the report path.

#### Scenario: Review report is generated
- **WHEN** review passes 1–11 are complete
- **THEN** `review.md` exists, is non-empty, and contains the provenance line, the three `Surface touched` lines, the finding identifiers, and the closing summary tally
- **AND** the completed payload reports the canonical change name and only the report path

#### Scenario: Worker returns completion
- **WHEN** `review.md` is verified from disk
- **THEN** the worker returns `completed` with severity counts, top three Critical findings when present, report path, the complete worker-authored `## Recommended Audits` block, and parent-branch statement
- **AND** it returns no report contents in the lifecycle payload

#### Scenario: Review with no findings writes a valid report
- **WHEN** the review produces no findings
- **THEN** `review.md` carries the provenance line, the three `Surface touched` lines, and a closing `Summary:` tally of zeros

#### Scenario: Verification lives only in the close step
- **WHEN** the worker card and the close step are read
- **THEN** the close step states the verification before `completed`
- **AND** the worker card points to the close step without listing the checks

### Requirement: Review lifecycle results carry no time field

The review worker SHALL return progress and terminal lifecycle results with no time field, while retaining passes 1–11, report generation, and triage ownership; the CLI response's `received_at` is the only observed time.

#### Scenario: Review reports a milestone
- **WHEN** a review milestone completes
- **THEN** its progress result carries the step ids and changed paths and no time field.

### Requirement: Review findings use the shared audit severity vocabulary

The review instruction and worker contract SHALL classify every finding with one of the shared severities `Critical`, `High`, `Medium`, or `Low`, or with the review-only `Question` category. `Critical` SHALL mean must-fix-before-merge (bugs, security holes, broken builds, contract violations, contradictions of the change artifacts); `High` SHALL mean should-fix-before-merge (significant maintainability, performance, or test-coverage issues that will hurt soon); `Medium` SHALL mean a moderate maintainability, performance, or test-coverage concern that does not threaten merge-readiness but should be addressed soon; `Low` SHALL mean nice-to-fix (naming, small refactors, low-impact polish); `Question` SHALL mean genuine uncertainty needing user input, used sparingly. The retired terms `Blocker`, `Major`, and `Minor` SHALL NOT be emitted by the review instruction, the review worker contract, or the review report. Every triage escalation SHALL reference the shared levels: blatant security findings SHALL be `Critical`, blatant performance and accessibility findings `High` or `Critical`, and glossary deviations `Low`. No mutation findings SHALL enter counts.

#### Scenario: Severity classification uses the shared levels
- **WHEN** the review classifies a finding
- **THEN** the finding's severity is exactly one of `Critical`, `High`, `Medium`, or `Low`, or its category is `Question`
- **AND** none of the retired terms `Blocker`, `Major`, or `Minor` is emitted

#### Scenario: Triage escalations reference the shared levels
- **WHEN** the review instruction escalates a blatant security, performance, or accessibility issue during triage
- **THEN** it names the finding `Critical` or `High` as applicable
- **AND** it does not use the retired triage vocabulary

#### Scenario: Mutation findings fold into the report by remapped severity
- **WHEN** review renders its counts after mutation-analysis retirement
- **THEN** only findings from passes 1–11 are counted
- **AND** no mutation findings or mMUT identifiers appear

### Requirement: Review findings carry severity-prefixed identifiers and a closing summary tally

The review instruction SHALL assign every finding a severity-prefixed identifier: the severity's initial followed by its sequence within that severity in the current report (`C1`, `H1`, `M1`, `L1`, and `Q1`), restarting at 1 for each level per review. The report SHALL close with `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Questions=<count>` whose counts match its listed findings. Completion verification SHALL reference the top three `Critical` findings when present, never the retired `Blocker` term.

#### Scenario: Every finding carries an identifier
- **WHEN** the review report lists a finding
- **THEN** the finding heading leads with its severity-prefixed identifier
- **AND** identifiers restart at 1 per level per report

#### Scenario: Report closes with the summary tally
- **WHEN** the review report is complete
- **THEN** it closes with a `Summary:` line tallying `Critical`, `High`, `Medium`, `Low`, and `Questions` counts that match the listed findings
- **AND** the worker completion verification names the top three `Critical` findings when present

### Requirement: Review close runs a pre-save adversarial findings check

The review close step SHALL challenge the in-memory draft before saving to discard false positives and correct severity. It SHALL skip the adversary only when the draft has no findings; otherwise it SHALL dispatch exactly one budget-explorer receiving only per-finding identifier, file:line, category, and one-line problem statement without diff or raw code. It SHALL scope the adversary to current diff findings, keep recorded decisions settled, require per-finding keep/discard/downgrade verdicts with why under 40 words and total report under 800 words, let the worker accept or reject each verdict, keep discards invisible, and recompute the tally over kept findings at final severity. Subagent failure SHALL preserve worker findings without blocking. No mutation-specific exemption remains; all other adversarial-close behavior SHALL stay unchanged.

#### Scenario: Adversarial check filters review draft
- **WHEN** the in-memory review draft contains findings
- **THEN** the worker runs one bounded adversary and saves only kept findings with recomputed Summary tally

#### Scenario: Mutation findings bypass the adversary
- **WHEN** review applies the adversarial check after mutation-analysis retirement
- **THEN** no mutation findings or exemption exist and every draft finding is eligible for the unchanged bounded check

### Requirement: Domain Alignment reports goal coverage and scope creep only through findings

The Domain Alignment pass SHALL report a goal in `proposal.md` or an acceptance criterion in `specs/**/*.md` that the change does not cover as a finding with severity by impact, and SHALL report scope creep as a `Question`. It SHALL report each gap or addition once: when the gap or addition already contradicts a recorded decision, it SHALL be reported as that contradiction. No Summary paragraph SHALL record goal coverage or scope creep.

#### Scenario: Uncovered acceptance criterion
- **WHEN** the diff leaves an acceptance criterion of the change's specs uncovered
- **THEN** the report lists a finding for that gap at a severity chosen by its impact

#### Scenario: Scope creep
- **WHEN** the diff adds behavior that the change's artifacts do not ask for
- **THEN** the report lists it as a `Question` finding

#### Scenario: Gap that contradicts a recorded decision
- **WHEN** a gap or addition also contradicts a recorded decision
- **THEN** the report lists it once, as the contradiction

### Requirement: A review pass with nothing to report stays silent

The review analysis SHALL state once that a pass with nothing to report stays silent and leaves nothing in the report. It SHALL NOT record per-pass no-surface, skipped, or clean outcomes. The analysis step SHALL be complete when the three surface outcomes (security, performance, accessibility) and the findings list are settled, with the eleven passes applied to every changed file.

#### Scenario: Glossary pass without a glossary
- **WHEN** the repository has no `GLOSSARY.md`
- **THEN** the Domain Language Consistency pass leaves nothing in the report

#### Scenario: Resilience pass without surface
- **WHEN** the diff has no resilience surface
- **THEN** the Resilience pass yields no findings and leaves nothing in the report

### Requirement: Triage passes decide the surface without listing files

The security, performance and accessibility triage passes SHALL decide `surface touched: yes/no` from their unchanged surface criteria without listing the touched files, and SHALL keep recommending their audit on yes.

#### Scenario: Security surface touched
- **WHEN** the diff touches an authentication path
- **THEN** the security triage records `Surface touched: Yes` with no file list
- **AND** the completed summary recommends `/sai-6-security`

### Requirement: Review severity definitions are stated once in the step library common file

The review step library SHALL define the five severities once, in `sai/commands/review/steps/common.md` § Severity, because both the analysis step and the close step assign severity. `sai/commands/review/steps/close-review-outcome.md` SHALL assign severity by pointing to that section and MUST NOT restate the definitions. The definitions SHALL keep their existing wording.

#### Scenario: The close step classifies a finding
- **WHEN** the close step classifies a finding
- **THEN** it applies the severity definitions of `steps/common.md` § Severity

### Requirement: One blatant-defect rule governs the triage passes

`sai/commands/review/steps/resolve-review-analysis.md` SHALL state once, before passes 3 to 5, that audit recommendations come only from those passes, followed by one blatant-defect rule: a defect in the pass's domain obvious from the diff alone SHALL also be raised as an individual finding, `Critical` for security and `High` or `Critical` for performance and accessibility, with a note that the dedicated audit covers the rest. The rule SHALL keep one calibrating example per domain: a literal hardcoded password (security), a `SELECT *` inside a per-row loop (performance), and an `<img>` without `alt` (accessibility). Passes 3 to 5 SHALL close with their audit recommendation only, and the resilience pass SHALL carry no audit-recommendation sentence of its own.

#### Scenario: Blatant security defect
- **WHEN** the diff adds a literal hardcoded password
- **THEN** the review recommends `/sai-6-security` and raises a `Critical` finding noting that the dedicated audit covers the rest

#### Scenario: Resilience finding
- **WHEN** pass 11 raises a resilience finding
- **THEN** the finding produces no audit recommendation, because recommendations come only from passes 3 to 5

### Requirement: Each review worker rule is stated once beside the step that uses it

The review worker contract `sai/commands/review/worker.md` SHALL state the active-step pointer rule positively (execute only the step the pointer names), the joint first progress event, and the write scope, and `sai/commands/review/steps/common.md` MUST NOT repeat them. The worker contract SHALL carry no sentence about OpenSpec prerequisite checks. The delegated review-mode instructions, including the per-group `budget-explorer` output contract, SHALL be stated in `sai/commands/review/steps/establish-diff-scope.md`, and the analysis step SHALL inspect the file groups that step recorded, as that step directs. The 500-line threshold, the shared cap of eight dispatches per review, the eleven passes, and the fixed stop texts SHALL stay unchanged.

#### Scenario: Delegated review mode
- **WHEN** the diff totals more than 500 changed lines
- **THEN** the scope step partitions the changed files into at most eight groups and names the output contract `file:line` + pass category + ≤80 words per finding for the analysis step's per-group `budget-explorer`

#### Scenario: Common file carries no worker rule
- **WHEN** `sai/commands/review/steps/common.md` is read
- **THEN** it contains no step-delivery pointer rule, no joint first progress event rule, and no write-scope statement

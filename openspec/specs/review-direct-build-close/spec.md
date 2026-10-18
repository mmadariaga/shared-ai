# review-direct-build-close Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Review Direct Build Close Selector

After successful review and a legible triage parse, the `/sai-deep-review` close SHALL offer the Direct Build round when `review.md` or an activated audit reports an open fixable finding or an open Question, including runs with zero activated audits. A fixable finding is any finding that is not a Question, as defined in `sai/policies/finding-state.md`. When no report qualifies for the round, the close SHALL preserve its normal terminal, including the exact zero-audit literal for a zero-audit run. Missing review content or no legible triage section SHALL retain the error close without offering correction authorization. Existing exclusions and the round write authorization boundaries SHALL remain unchanged.

#### Scenario: Findings remain
- **WHEN** a successful review with a legible triage parse or an activated audit reports an open fixable finding or an open Question
- **THEN** the close asks the Direct Build round and dispatches the `/sai-3-implement` fix segment only after the user chooses to fix

#### Scenario: Zero audits with eligible review findings
- **WHEN** no audit activates after successful review and a legible triage parse, and the freshly generated `review.md` reports an open fixable finding or an open Question
- **THEN** the composition SHALL ask the same Direct Build round, with `review.md` as its only report, and keep the existing round boundaries, without dispatching an audit

### Requirement: Findings-Scoped Fix Input

The `/sai-deep-review` Direct Build input SHALL use the freshly generated `review.md` plus only the security, performance, and accessibility findings from audits activated and regenerated in that same run. With zero activated audits, only the freshly generated `review.md` SHALL be inspected for the round and the fix input; existing non-activated audit reports SHALL remain untouched and excluded from both. Before dispatch, the close SHALL resolve the round into a validated selected set and excluded set. It SHALL pass to the `/sai-3-implement` fix segment only the selected findings, which are the fixable findings kept plus the Questions answered, each answered Question with the user answer attached verbatim. It SHALL also pass a labeled exclusion list of the excluded fixable findings and the unanswered Questions.

#### Scenario: Non-recommended audit excluded
- **WHEN** an audit was not recommended in the same run
- **THEN** its findings are never touched nor regenerated as fix input

#### Scenario: Excluded finding is not fix input
- **WHEN** a fixable finding is excluded in the Direct Build round, or a Question is left unanswered
- **THEN** the fix segment input SHALL omit that finding as a requested fix, SHALL list it in the labeled exclusion list, and the finding SHALL remain unresolved in its report.

#### Scenario: Zero audits exclude stale reports
- **WHEN** no audit activates and existing audit reports contain findings from earlier runs
- **THEN** the composition SHALL inspect only the freshly generated `review.md` for the round and the fix input, leaving all non-activated audit reports untouched

### Requirement: Findings Selection Before Fix Dispatch

Before the Direct Build round, the close SHALL show every open finding of each qualifying report with its source-qualified ID, severity, title, brief problem/impact, and location, and SHALL show each open Question in full. It SHALL resolve a validated selected set and excluded set before dispatching the `/sai-3-implement` fix segment. Each report question SHALL offer exactly three answers:

- `Fix all fixable findings (Recommended)` SHALL select every open fixable finding of the report and leave its Questions open.
- `Fix nothing` SHALL select nothing from the report.
- The native picker built-in free-text response SHALL be read immediately, without an intermediate question. It carries the identifiers to exclude (`exclude: review:C1, review:L2`) and the answers to Questions, one per line (`review:Q1: <answer>`). It SHALL select every open fixable finding of the report except the excluded ones, plus each answered Question.

IDs SHALL be trimmed, matched case-insensitively against that report displayed source-qualified IDs, deduplicated, and kept in report order. An unknown or unqualified ID, an answer to a non-Question, or an exclusion of a Question SHALL be an invalid answer. When every answer is `Fix nothing`, the picker is dismissed, or nothing is selected, the close SHALL report that no fix or commit will run and run `decline-close` without dispatch.

#### Scenario: Fix all path selects every eligible finding
- **WHEN** the user answers `Fix all fixable findings (Recommended)` for a report
- **THEN** the close SHALL select every open fixable finding of that report, exclude none of them, and leave that report Questions open.

#### Scenario: Follow-up exclusions path validates the submitted IDs
- **WHEN** the user submits identifiers to exclude in a report free-text answer
- **THEN** the close SHALL validate them against that report displayed source-qualified IDs before dispatching and SHALL pass only the remaining fixable findings, plus any answered Questions, to the `/sai-3-implement` fix segment, with no follow-up question.

#### Scenario: Native free-text path does not add a turn
- **WHEN** the user submits exclusions or Question answers through the native picker built-in free-text response
- **THEN** the close SHALL read that text immediately as the report exclusions and answers and SHALL not ask an intermediate question.

#### Scenario: Invalid exclusions block dispatch
- **WHEN** a report free-text answer carries an unknown or unqualified ID, an answer to a non-Question, or an exclusion of a Question
- **THEN** the close SHALL display that report valid source-qualified IDs and SHALL dispatch no fix segment until the answer is valid or the close ends.

#### Scenario: All eligible findings are excluded
- **WHEN** every answer of the round is `Fix nothing`, the picker is dismissed, or the answers select nothing
- **THEN** the close SHALL report that no fix or commit will run and execute `decline-close` without dispatch.

### Requirement: Direct Build Close Round

The Direct Build close of `/sai-deep-review` SHALL ask a single round after every segment has finished and the summary is printed. The round SHALL have one question per report of the close input that has an open fixable finding or an open Question, in the fixed order `review.md`, `security.md`, `performance.md`, `accessibility.md`. When no report qualifies, the close SHALL ask no round and the caller standard close SHALL run. Choosing to fix anything in the round SHALL authorize the delegated writes of the `/sai-3-implement` fix segment, and nothing SHALL be dispatched before that answer. On Claude Code the round SHALL be one `AskUserQuestion` call carrying every question. On opencode it SHALL be the same questions in one `question` call when the picker accepts several questions, and otherwise one call per question, consecutively and in the same order.

#### Scenario: The round follows the summary
- **WHEN** every segment has finished, the summary is printed, and both `review.md` and `security.md` have an open fixable finding or an open Question
- **THEN** the close SHALL ask one round with the review question before the security question, as a single `AskUserQuestion` call on Claude Code

#### Scenario: No report qualifies
- **WHEN** no report of the close input has an open fixable finding or an open Question
- **THEN** the close SHALL ask no round and the caller standard close SHALL run

#### Scenario: opencode picker without several questions
- **WHEN** the opencode `question` picker does not accept several questions in one call
- **THEN** the close SHALL ask the same questions one call per question, consecutively and in the same report order

### Requirement: Questions Are Answered In The Round

Before the round, the close SHALL show each open Question in full under its own heading, with the reason it needs an answer. The user SHALL answer a Question in the free-text answer of its report question. An answered Question SHALL be fixed according to its answer and passed to the `/sai-3-implement` fix segment as a selected finding, with the user answer attached verbatim. An unanswered Question SHALL stay open in its report and SHALL appear in the labeled exclusion list.

#### Scenario: An answered Question becomes fix input
- **WHEN** the user free text for a report carries `review:Q1: <answer>`
- **THEN** the `/sai-3-implement` fix segment SHALL receive `review:Q1` as a selected finding with that answer attached verbatim

#### Scenario: An unanswered Question stays open
- **WHEN** the user answers a report question without answering one of its Questions
- **THEN** that Question SHALL stay open in its report and SHALL be listed in the exclusion list, never as a requested fix

### Requirement: Invalid Round Answer Retries Once

An invalid answer for a report SHALL repeat only that report's question, once, after showing that report's valid source-qualified IDs. A second invalid answer for the same report SHALL end the close: the close SHALL dispatch nothing, SHALL commit nothing, and SHALL run `decline-close`.

#### Scenario: First invalid answer repeats one question

- **WHEN** the free-text answer for one report names an unknown identifier
- **THEN** the close SHALL show that report's valid IDs and repeat only that report's question

#### Scenario: Second invalid answer ends the close

- **WHEN** the repeated question for the same report also receives an invalid answer
- **THEN** the close SHALL dispatch nothing, commit nothing, and run `decline-close`

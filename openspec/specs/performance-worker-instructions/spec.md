# performance-worker-instructions Specification

## Purpose
TBD - created by archiving change trim-performance-report-and-instructions. Update Purpose after archive.

## Requirements

### Requirement: Each performance rule is stated once

The performance worker files SHALL state each rule once. `steps/common.md` SHALL carry one `Hard Rules` section with an **Evidence** rule (every finding points to actual code, query, trace, profiler output, bundle stat, log sample, or measurement, quoted exactly), an **Acknowledged** rule (accepted trade-offs are *Acknowledged*, never findings), and a **Write limit** rule that leads with "The only file written is `openspec/changes/{change-name}/performance.md`" followed by the prohibition on modifying production code, schemas, migrations, configuration, dependencies, manifests, or lockfiles. The severity table SHALL have no Numeric column. `steps/common.md` § Communication Mode, `worker.md`, and the close step SHALL point to `performance-report.template.md` for the report shape and finding fields instead of restating them.

#### Scenario: Reading the write limit
- **WHEN** the performance worker loads `steps/common.md`
- **THEN** it finds the write limit stated once, in § Hard Rules, and not repeated in a Remember block or in `worker.md`

### Requirement: Worker contract structure

`sai/commands/performance/worker.md` SHALL have the sections Change Resolution and Proposal Gate, `## Steps`, and Continuation and Reconstruction. `## Steps` SHALL list the canonical step ids and labels unchanged, with the progress batch that reports each one. With no active changes, the worker SHALL return `failed` with exactly "No active changes found. Run `/sai-1-spec` to create one."

#### Scenario: No active changes
- **WHEN** `/sai-7-performance` runs with no change name and `openspec list --json` returns zero changes
- **THEN** the worker returns `failed` with the exact no-active-changes text

### Requirement: Step completion criteria

Every performance step file SHALL open with a checkable "The step is done when …" criterion. The `map-stack-hot-paths` criterion SHALL require every file of the selected scope to be assigned a tier or recorded as having no performance surface, and stack components per tier, hot paths, the baseline reference, and accepted trade-offs to exist. The `audit-performance-tiers` criterion SHALL require every hot path to be evaluated against every item of its tier's checklist and the cross-cutting checklist, with every flaw recorded with its fields. The `resolve-diagnostics` criterion SHALL require the gate to be resolved by an authorized run, the user's skip, or the absence of a diagnostic that would firm up a finding. The `close-performance-outcome` criterion SHALL require the saved report to pass its form verification.

#### Scenario: Mapping cannot close on one hot path
- **WHEN** the mapping step has identified one hot path but some files of the selected scope are not yet classified
- **THEN** the step is not done and reports no `map-stack-hot-paths` progress event

### Requirement: Mapping step owns the delegation limits

`map-stack-hot-paths` SHALL be the single source of the 500-LOC cutover and of the cap of at most eight `budget-explorer` invocations per audit, file inspections and context lookups together. Step files SHALL refer to step ids instead of "Phase 1" to "Phase 6".

#### Scenario: Large diff
- **WHEN** the selected diff exceeds 500 LOC
- **THEN** the worker does not load the full diff and delegates per-file inspection within the eight-invocation cap

### Requirement: Close step owns the chat summary

The close step SHALL define the `completed` summary: severity counts, up to three Critical/High findings when present, the report path, and the selected parent branch in diff mode; for a Not Applicable report, the justification SHALL replace the counts and findings. The payload SHALL carry the summary and the report SHALL stay in `performance.md`. The adversary dispatch SHALL receive each metric with its measured or estimated mark.

#### Scenario: Completed summary
- **WHEN** the close step returns `completed` for a report with two High findings in diff mode
- **THEN** the summary carries the severity counts, both High findings, the report path, and the parent branch, and no report content

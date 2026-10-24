# performance-runtime-diagnostics Specification

## Purpose
TBD - created by archiving change trim-performance-report-and-instructions. Update Purpose after archive.

## Requirements

### Requirement: Diagnostics are opt-in with --runtime

`/sai-7-performance` SHALL accept a `--runtime` option, declared in `sai/commands/performance/options.md` beside `--tier` and applied in `steps/common.md` § Scope. Without `--runtime`, `resolve-diagnostics` SHALL resolve its gate as skipped without asking: the worker SHALL report `resolve-diagnostics` in the same progress event as `audit-performance-tiers`, SHALL ask no question, and the findings SHALL keep their estimated marks. Step ids, labels, and the `performance-standalone@1` machine SHALL stay unchanged.

#### Scenario: Run without --runtime
- **WHEN** `/sai-7-performance` runs without `--runtime` and the tier audit completes
- **THEN** the tier-analysis progress event carries `audit-performance-tiers` and `resolve-diagnostics`, no `needs_input` is returned, and the next pointer is `close-performance-outcome`

### Requirement: Authorized read-only diagnostics

With `--runtime`, `resolve-diagnostics` SHALL ask no question: `--runtime` is the whole authorization. It SHALL resolve the gate with no diagnostic when none would firm up a finding. Otherwise the worker SHALL list each diagnostic with its target and the finding it serves, run each one in bounded read-only measurement mode against a local or development target the repository configuration names, never a production target, and quote its output exactly; each measured number SHALL replace the estimate it firms up. A diagnostic whose tool is not installed, whose target is not reachable, or that has no safe target SHALL be recorded as unavailable with its reason in the report's `Diagnostics` field, and the findings it would have firmed up SHALL keep their estimated marks.

#### Scenario: Authorized diagnostics
- **WHEN** `--runtime` is set and a finding would be firmed up by `EXPLAIN ANALYZE`
- **THEN** the worker runs that command read-only with no question and replaces that finding's estimated number with the measured one

#### Scenario: Diagnostic tool unavailable
- **WHEN** `--runtime` is set and the profiler a diagnostic needs is not installed
- **THEN** the report's `Diagnostics` field marks it unavailable with the reason and the audit completes with the estimate kept

### Requirement: Per-tier checklist loading

The backend, frontend, db, and queue checklists SHALL live in `sai/commands/performance/checklists/{backend,frontend,db,queue}.md`. `audit-performance-tiers` SHALL load each with `For each tier in the selected scope: Fetch @sai/commands/performance/checklists/<tier>.md`, so a tier outside the selected scope loads no checklist, and SHALL keep the cross-cutting checklist in the step itself.

#### Scenario: Single-tier audit
- **WHEN** `/sai-7-performance` runs with `--tier db`
- **THEN** the tier audit loads only `checklists/db.md` plus the in-step cross-cutting checklist

### Requirement: Wrappers advertise --runtime

The Claude Code and opencode `sai-7-performance` wrappers SHALL mention optional `--runtime` diagnostics in their description, and the Claude Code wrapper SHALL list `[optional: --runtime]` in its `argument-hint`.

#### Scenario: Wrapper description
- **WHEN** a user lists commands in Claude Code or opencode
- **THEN** the `/sai-7-performance` description mentions optional `--runtime` diagnostics

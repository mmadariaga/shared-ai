# performance-report-shape Specification

## Purpose
TBD - created by archiving change trim-performance-report-and-instructions. Update Purpose after archive.

## Requirements

### Requirement: Performance report carries only consumed sections

The performance report template SHALL define `performance.md` as the title, a single provenance line, the findings, an optional Acknowledged Trade-offs section, and the closing `Summary:` tally. It SHALL instruct the worker to write a section only when it has content. The template SHALL NOT define Executive Summary, Hot Paths in Scope, Observability Gaps, Prioritized Remediation Plan, or Validation Plan sections, and the OpenSpec scaffold `openspec/schemas/sai-workflow/templates/performance.md` SHALL follow the same heading sequence.

#### Scenario: Audit with findings
- **WHEN** the performance worker writes a report for a selected scope with findings
- **THEN** `performance.md` contains only the provenance line, the findings, the Acknowledged Trade-offs section when trade-offs were relied on, and the closing `Summary:` tally

#### Scenario: Audit with no findings
- **WHEN** the audit of a selected scope with a performance surface finds no flaw
- **THEN** the report carries the provenance line and the tally `Summary: Critical=0 High=0 Medium=0 Low=0 Informational=0`

### Requirement: Single provenance line

The report SHALL carry exactly one header line in the form `**Scope:** {…} · **Tiers:** {…} · **Baseline:** {…} · **Date:** {YYYY-MM-DD}`. Scope SHALL name the parent branch in diff mode, Tiers SHALL name only the tiers audited, and Baseline SHALL name the reference or state that absolute thresholds are used, as the single baseline source for every finding.

#### Scenario: Diff-mode provenance
- **WHEN** the audit runs in diff mode against parent branch `main` on the backend and db tiers without a baseline
- **THEN** the provenance line names diff vs `main`, the tiers backend and db, and absolute thresholds as the baseline

### Requirement: Finding fields and estimate mark

Every finding SHALL keep its fields (Location, Category, Symptom, Evidence, Root cause, Expected impact if unfixed, Remediation, Expected gain, Validation method, Spec note) in all five severities, Informational included, and its heading SHALL lead with its severity-prefixed identifier. Every number in a finding MUST be measured or carry the mark `estimated — verify with {method}`. A Critical or High finding MAY carry estimated numbers, because severity follows user-visible impact. A measured number SHALL replace the estimate when a diagnostic ran. The template SHALL be the single source of the finding fields and of this number rule, and `Observability` SHALL be an accepted finding category.

#### Scenario: Unmeasured High finding
- **WHEN** a High finding's Symptom latency was not measured
- **THEN** that number carries `estimated — verify with {method}` and the finding stays High

### Requirement: Not Applicable report

When the diff is empty or the selected scope after `--tier` has no performance surface, the worker SHALL write a `performance.md` with only the title, the provenance line, and `## Not Applicable` with its justification, with no findings and no tally line. The justification SHALL name the tier filter when the filter excluded the touched surface.

#### Scenario: Tier filter excludes the touched surface
- **WHEN** `/sai-7-performance` runs with `--tier queue` on a diff that touches only frontend files
- **THEN** the report is a Not Applicable report whose justification names the tier filter, and the run returns `completed`

### Requirement: Saved report verification

Before returning `completed`, the close step SHALL verify the saved file in its form. A normal report SHALL exist, be non-empty, carry the provenance line, lead every finding heading with its severity-prefixed identifier, and close with a `Summary:` tally that matches the findings. A Not Applicable report SHALL carry the provenance line, the `## Not Applicable` heading, and the justification.

#### Scenario: Tally mismatch
- **WHEN** the saved normal report's `Summary:` counts differ from its findings
- **THEN** the close step does not return `completed` until the tally matches

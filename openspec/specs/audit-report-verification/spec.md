# audit-report-verification Specification

## Purpose
TBD - created by archiving change audits-run-unattended-goal-driven. Update Purpose after archive.

## Requirements

### Requirement: lint.js checks an audit report against its audit's severity subset

`sai/tools/lint.js` SHALL provide `audit-report <file> --audit <security|performance|accessibility>`, which validates that the report opens with `# {Audit} Report — {Feature Name}`, carries the `**Scope:**` provenance line, leads every finding heading under a Findings section with a severity-prefixed identifier from that audit's own level subset under ADR 0107b (security `Critical/High/Medium/Low`; performance and accessibility add `Informational`), numbers identifiers 1 to n once per severity, and closes with exactly one `Summary:` line in that audit's form whose counts match the findings. For accessibility it SHALL also require the `Executive Summary`, `Coverage Notes`, `Pending Manual Checks`, and `Re-Test Checklist` sections and an Executive Summary severity table that matches the findings. A missing or unknown `--audit` SHALL exit 2.

#### Scenario: Security report with an Informational finding
- **WHEN** `lint.js audit-report security.md --audit security` reads a finding identified `I1`
- **THEN** it reports `INVALID_IDENTIFIER_FORMAT` because Informational is outside the security subset

#### Scenario: Tally mismatch
- **WHEN** a performance report holds two High findings and its Summary line says `High=1`
- **THEN** the check reports `SUMMARY_TALLY_MISMATCH` and exits non-zero

### Requirement: A Not Applicable audit report has a justification and no tally

The `audit-report` check SHALL accept a report with a `## Not Applicable` section only when that section carries a non-empty `**Justification:**` line, holds no findings, and carries no `Summary:` line.

#### Scenario: Not Applicable with a tally
- **WHEN** a Not Applicable accessibility report also carries a `Summary:` line
- **THEN** the check reports `NOT_APPLICABLE_WITH_TALLY`

### Requirement: check-cited-paths.js validates the paths an audit report cites

`sai/tools/check-cited-paths.js` SHALL provide an `audit-report <change-name> --audit <audit>` mode that requires every backticked `path/with/slash.ext[:line]` span in the `**File:**` and `**Location:**` fields of the findings of `openspec/changes/<change-name>/<audit>.md`, outside fenced code blocks, to exist, reporting a missing one as `EVIDENCE_PATH_MISSING`. Endpoints, selectors, components, URLs, and bare file names SHALL NOT be checked. The mode SHALL exit 2 when `--audit` is missing or unknown, when `--findings` is passed, or when the report does not exist. The existing `sai-1` and `sai-2` modes SHALL keep their behavior.

#### Scenario: A finding cites a missing file
- **WHEN** a security finding's `**File:**` field cites `src/missing/handler.js:12` and that file does not exist
- **THEN** the check reports `EVIDENCE_PATH_MISSING` for that path

#### Scenario: A selector is not a path
- **WHEN** an accessibility finding's `**Location:**` field cites `` `button.primary` ``
- **THEN** the check does not treat it as a path

# delta-header-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.

## Requirements

### Requirement: Delta header tool path resolution

The system SHALL resolve `check-delta-headers.js` by the shared tool-resolution policy, taking the first existing harness candidate verbatim and reporting tried candidates without a prose fallback when none exists. Temporary checks SHALL invoke `node <tool-path> <change-name> --delta-dir <dir>/specs`, with the confirmed name and transfer or correction directory. Accepted flags SHALL remain `--json`, `--root`, `--delta-dir`, and `--specs-dir`, never `--cwd` or the retired `--scenario-exceptions`. Main specs SHALL resolve from the project root. Claude Code and opencode SHALL share these validation semantics.

#### Scenario: Preflight via resolved copy
- **WHEN** backfill or archive runs header preflight
- **THEN** it uses the resolved tool copy, confirmed name, and accepted flags

#### Scenario: Backfill preflight targets the transfer directory
- **WHEN** backfill checks temporary drafts
- **THEN** it uses the transfer directory specs as --delta-dir

#### Scenario: Temporary exceptions supplement the invocation
- **WHEN** a boundary check receives a request to supply temporary scenario exceptions
- **THEN** it uses no exception file or flag and enforces mandatory preservation against project-root main specs

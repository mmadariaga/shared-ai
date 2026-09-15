# delta-header-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.
## Requirements
### Requirement: Delta header tool path resolution

The system SHALL resolve `check-delta-headers.js` per the shared tool-resolution rule (first existing candidate per harness, copied verbatim; if none exists it SHALL name the tried candidates and stop with no prose fallback) and SHALL invoke `node <tool-path> <change-name> --delta-dir <tmp>/specs` with the confirmed change name, keeping the tool's own accepted flags (`--json` plus `--root`/`--delta-dir`/`--specs-dir`; no `--cwd`) byte-identical.

#### Scenario: Preflight via resolved copy

- **WHEN** backfill or archive runs the delta-header preflight
- **THEN** it uses the resolved copy with the confirmed change name and unchanged flags


# delta-header-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.

## Requirements

### Requirement: Delta header tool path resolution

The system SHALL resolve `check-delta-headers.js` per the shared tool-resolution rule (first existing candidate per harness, copied verbatim; if none exists it SHALL name the tried candidates and stop with no prose fallback) and SHALL invoke `node <tool-path> <change-name> --delta-dir <dir>/specs` with the confirmed change name, where `<dir>` is the backfill coordinator's transfer directory on the backfill route and the archive route's staging directory `<tmp>` on the archive route, keeping the tool's own accepted flags (`--json` plus `--root`/`--delta-dir`/`--specs-dir`; no `--cwd`) byte-identical.

#### Scenario: Preflight via resolved copy

- **WHEN** backfill or archive runs the delta-header preflight
- **THEN** it uses the resolved copy with the confirmed change name and unchanged flags

#### Scenario: Backfill preflight targets the transfer directory

- **WHEN** the backfill coordinator runs the delta-header preflight
- **THEN** it passes `<transfer-dir>/specs` as `--delta-dir`

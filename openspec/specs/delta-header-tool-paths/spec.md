# delta-header-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.

## Requirements

### Requirement: Delta header tool path resolution

The system SHALL resolve `check-delta-headers.js` per the shared tool-resolution rule, taking the first existing candidate per harness and copying it verbatim. If none exists it SHALL name the tried candidates and stop without a prose fallback. It SHALL invoke `node <tool-path> <change-name> --delta-dir <dir>/specs` for temporary draft checks with the confirmed change name, where `<dir>` is the backfill transfer directory or the archive correction staging directory. It SHALL preserve the accepted `--json`, `--root`, `--delta-dir`, and `--specs-dir` flags, add `--scenario-exceptions <temporary-json-file>` for the applicable temporary metadata, and never pass `--cwd`. Main specifications SHALL resolve from the project root rather than from the temporary draft directory. Claude Code and opencode SHALL use the same validation semantics through the shared checker.

#### Scenario: Preflight via resolved copy
- **WHEN** backfill or archive runs the delta-header preflight
- **THEN** it uses the resolved copy with the confirmed change name and unchanged flags

#### Scenario: Backfill preflight targets the transfer directory
- **WHEN** the backfill coordinator runs the delta-header preflight
- **THEN** it passes `<transfer-dir>/specs` as `--delta-dir`

#### Scenario: Temporary exceptions supplement the invocation
- **WHEN** a boundary check uses independently approved temporary scenario exceptions
- **THEN** it supplies their file through `--scenario-exceptions` without changing project-root resolution or using `--cwd`

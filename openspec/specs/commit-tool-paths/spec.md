# commit-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.
## Requirements
### Requirement: Commit tool path resolution

The system SHALL resolve `commit.js` per the shared tool-resolution rule (first existing candidate per harness, copied verbatim; if none exists it SHALL name the tried candidates and stop with no prose fallback) and SHALL invoke `node <tool-path> collect --json --cwd <repo>` and `node <tool-path> apply --json --cwd <repo>` byte-identically, including `--amend` and `--acknowledge-secrets` variants.

#### Scenario: Collect and apply via resolved copy

- **WHEN** commit collects staged state or applies the authorized message
- **THEN** it uses the same resolved `commit.js` copy with unchanged flags


# pr-tool-paths Specification

## Purpose
Defines how `/sai-pr` resolves the installed `pr.js` path per harness.
## Requirements
### Requirement: PR tool path resolution

The system SHALL resolve `pr.js` per the shared tool-resolution rule (first existing candidate per harness, copied verbatim; if none exists it SHALL name the tried candidates and stop with no prose fallback) and SHALL invoke `node <tool-path> collect --json --change <change-name> --cwd <project-root>` for collect and `node <tool-path> apply --cwd <project-root>` (plus `--parent` where needed, no `--json`, since `--json` and `--change` are collect-only) for apply without changing semantics beyond path resolution.

#### Scenario: Collect and apply PR via resolved copy

- **WHEN** PR collects branch state or creates the PR
- **THEN** it uses the same resolved `pr.js` copy with the per-subcommand flags above


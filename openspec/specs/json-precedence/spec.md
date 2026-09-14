# json-precedence Specification

## Purpose
TBD - created by archiving change dual-subagent-depth-v1-v2. Update Purpose after archive.
## Requirements
### Requirement: JSON-over-JSONC precedence with winning-file-only operation
Both the installer merge and doctor validation SHALL target exactly one file deterministically choosing `opencode.json` over `opencode.jsonc` when both exist and SHALL leave the other file untouched. Fresh install with neither file SHALL create `opencode.jsonc` with both depth keys.
#### Scenario: Both files exist touches and validates only JSON
- **WHEN** both `opencode.json` and `opencode.jsonc` exist in the target base
- **THEN** the merge updates only `opencode.json` leaving `opencode.jsonc` byte-identical and doctor validates only `opencode.json`


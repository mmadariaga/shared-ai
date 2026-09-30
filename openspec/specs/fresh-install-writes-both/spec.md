# fresh-install-writes-both Specification

## Purpose
TBD - created by archiving change dual-subagent-depth-v1-v2. Update Purpose after archive.
## Requirements
### Requirement: Fresh install ships the opencode v2 depth key at 2
The fresh-install path SHALL write `experimental.subagent_depth` at 2, the opencode v2 key, by copying `configs/opencode.jsonc` verbatim. The sample SHALL NOT carry the opencode v1 top-level `subagent_depth`; an existing config that has it keeps it untouched.
#### Scenario: Fresh destination with neither file receives the v2 key
- **WHEN** fresh install runs with no `opencode.json` or `opencode.jsonc` present
- **THEN** the created `opencode.jsonc` contains `experimental.subagent_depth` 2 and no top-level `subagent_depth`


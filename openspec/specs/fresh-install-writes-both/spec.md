# fresh-install-writes-both Specification

## Purpose
TBD - created by archiving change dual-subagent-depth-v1-v2. Update Purpose after archive.
## Requirements
### Requirement: Fresh install ships both depth keys at 2
The fresh-install path SHALL write both top-level `subagent_depth` at 2 and `experimental.subagent_depth` at 2 by copying `configs/opencode.jsonc` verbatim with both keys present.
#### Scenario: Fresh destination with neither file receives both keys
- **WHEN** fresh install runs with no `opencode.json` or `opencode.jsonc` present
- **THEN** the created `opencode.jsonc` contains top-level 2 and experimental 2


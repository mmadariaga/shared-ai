# existing-config-backfill Specification

## Purpose
TBD - created by archiving change dual-subagent-depth-v1-v2. Update Purpose after archive.
## Requirements
### Requirement: Existing config backfills only absent depth keys preserving present values
The existing-config merge SHALL preserve any present depth value including invalid or wrong-type values and SHALL backfill only absent keys at 2 through `jsonc-parser` surgical edits preserving comments, trailing commas, indentation, and unrelated keys. A non-object `experimental` container counts as present and SHALL be left untouched by the installer.
#### Scenario: Only top-level present adds experimental preserving value
- **WHEN** merge runs on a parsable object config with top-level depth present and no experimental object
- **THEN** `experimental.subagent_depth` at 2 is added and the top-level value stays unchanged
#### Scenario: Only experimental present adds top-level preserving value
- **WHEN** merge runs on a parsable object config with experimental depth present and no top-level depth
- **THEN** top-level depth at 2 is added and the experimental value stays unchanged
#### Scenario: Divergent valid values and wrong-type values are preserved
- **WHEN** merge runs on a config with divergent values both at least 2 or with a non-numeric depth value
- **THEN** all present depth values are preserved and only absent keys are added at 2


# opencode-config-messaging Specification

## Purpose
TBD - created by archiving change installer-opencode-config-codegraph-warnings. Update Purpose after archive.

## Requirements

### Requirement: Existing config message SHALL require only experimental subagent depth
The existing-config fallback message SHALL name only `experimental.subagent_depth = 2` as the mandatory setting, show the full example path for `configs/opencode.jsonc`, and state that everything else is left untouched. It SHALL NOT mention `external_directory`, agent blocks, model fields, or trusted-model language.

#### Scenario: Fallback message content
- **WHEN** the existing opencode config is unparseable or has a non-object root
- **THEN** the output names experimental.subagent_depth 2, shows the full opencode.jsonc path, and contains no external_directory text

### Requirement: Existing config merge SHALL ensure only experimental subagent depth
The merge SHALL create `experimental.subagent_depth = 2` when the block is missing or-raises it when below 2, and SHALL leave `permission.external_directory`, top-level `subagent_depth`, comments, and all other keys untouched. It SHALL emit no permission notice or diagnostic.

#### Scenario: Depth-only ensure preserves permissions
- **WHEN** an existing config carries custom permission entries and a low or missing experimental depth
- **THEN** the merge sets experimental.subagent_depth to 2 and preserves every permission entry byte-for-byte

### Requirement: Fresh install template SHALL ship depth plus three allow entries
A fresh install SHALL copy the template containing `experimental.subagent_depth: 2` plus the three `permission.external_directory` allow entries for `sai/**`, `commands/**`, and `skills/**`.

#### Scenario: Fresh install content
- **WHEN** no existing config is present during install
- **THEN** the written config contains experimental depth 2 and the three allow entries

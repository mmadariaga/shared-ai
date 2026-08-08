# installer-config-guidance Specification

## Purpose
TBD: Define preservation-first installer guidance and seeded settings for the binding-derived opencode worker census.

## Requirements

### Requirement: OpenCode configuration merging remains preservation-first

When the installer's opencode-config path merges into an existing configuration, it SHALL perform only the SAI external-directory permission merge. It SHALL NOT add, modify, or remove any agent key. It MUST preserve existing agent definitions, user-selected models, variants, task permissions, comments, formatting, unrelated keys, JSON/JSONC precedence, malformed-config fallback, and idempotent behavior established by the existing opencode configuration contract.

#### Scenario: Existing customized entries survive the permission merge

- **WHEN** an existing `opencode.json` or `opencode.jsonc` contains customized definitions for the helper agents
- **THEN** the customized definitions remain unchanged and no agent key is inserted or overwritten

#### Scenario: A fully configured destination is unchanged

- **WHEN** the selected opencode configuration already contains the SAI external-directory rule
- **THEN** the installer performs no configuration write and preserves the selected file byte-for-byte

#### Scenario: The selected malformed config is protected

- **WHEN** the selected config is unparsable or has a non-object root
- **THEN** the installer leaves it unchanged and emits the existing manual-guidance fallback rather than partially writing the merge

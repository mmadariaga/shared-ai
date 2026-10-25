# generic-agent-name-migration Specification

## Purpose
Provide consistent generic agent identities across supported harnesses and migrate legacy opencode definitions without losing configured models or unrelated user files.

## Requirements

### Requirement: Shared Generic Agent identities

Both Claude Code and opencode SHALL expose budget-explorer, budget-executor, and budget-subagent as the generic research, execution, and task agent names. SAI SHALL preserve their existing responsibilities and model defaults, update active dispatch bindings, capability grants, preset target keys, customization inventory, tests, and documentation, and install no old-name compatibility aliases.

#### Scenario: Fresh installation uses common names

- **WHEN** SAI installs either supported harness into a fresh destination
- **THEN** the three budget-* generic agents are available with unchanged role behavior and shipped model settings, and no explore, executor, or budget alias is installed

#### Scenario: Dispatch and preset names agree

- **WHEN** SAI projects opencode worker permissions or reads shipped presets and budget bindings
- **THEN** every generic-agent target uses its matching budget-* name while internal capability-role identifiers remain unchanged

### Requirement: Legacy opencode settings migration

Opencode installation SHALL retire exact agents/explore.md, agents/executor.md, and agents/budget.md paths globally and in the project being refreshed. It SHALL NOT transfer their model, variant, or text to budget-explorer.md, budget-executor.md, or budget-subagent.md. Current-name definitions SHALL preserve their own tuning and customization suffix. Absent global replacements SHALL receive shipped defaults; missing local replacements SHALL NOT be created. Native handling of structured models and optional variant absence SHALL remain for current-name files without sidecars. Claude Code Generic Agent names SHALL remain unchanged.

#### Scenario: Owned predecessor settings survive migration
- **WHEN** a legacy agent has custom settings and its replacement is absent
- **THEN** installation deletes the declared predecessor and seeds an absent global replacement from shipped defaults, without transferring old settings

#### Scenario: Existing replacement settings take precedence
- **WHEN** legacy and current-name regular files both exist with different settings
- **THEN** installation removes the declared predecessor and retains the current-name settings without importing or reporting a migration conflict

#### Scenario: Repeat installation preserves settings
- **WHEN** installation runs again after retired-name cleanup
- **THEN** current-name settings and suffixes remain intact, absent retired paths are no-ops, and no old-name alias is created

### Requirement: Protected migration destinations and cleanup

Installation SHALL inspect current-name Generic Agent destinations before reading or writing. A symlink, dangling link, directory, or other non-regular destination SHALL be skipped with a manual-review notice and its target left unchanged. Retired predecessor cleanup SHALL be independent of replacement success and content identity: exact declared regular files and file symlinks SHALL be unlinked even when edited or their replacement is blocked. Directories and paths through linked directories SHALL be skipped without recursive or external deletion.

#### Scenario: Linked destination with predecessor
- **WHEN** a current-name destination is linked and a regular legacy predecessor exists
- **THEN** installation leaves the current link and target unchanged with a notice but deletes the exact retired predecessor

#### Scenario: Linked destination without predecessor
- **WHEN** a new-name destination is a symbolic link without a legacy predecessor
- **THEN** installation skips the destination before any read or write and leaves the target unchanged

#### Scenario: Blocked replacement does not consume predecessor
- **WHEN** a replacement is a directory or other non-regular entry and a regular retired predecessor exists
- **THEN** installation skips the replacement and independently deletes the exact retired predecessor

#### Scenario: Modified predecessor is protected
- **WHEN** a declared retired predecessor is edited, a file symlink, or a directory
- **THEN** installation deletes the edited regular file or unlinks the file symlink without touching its target, but skips directories and linked parents

#### Scenario: Partial migration resumes
- **WHEN** a blocked current-name replacement later becomes available
- **THEN** reinstallation preserves completed current-name settings and seeds an absent global replacement from defaults, not from retired settings

### Requirement: Manual overrides and lifecycle protection

Installation SHALL refresh existing current-name managed local definitions and delete declared retired paths in the current project for selected harnesses; setup SHALL refresh both harnesses in its named project. Other projects and unrelated filenames SHALL remain unchanged. Legacy global configuration agent-map entries SHALL remain outside installer ownership; guidance SHALL explain that agent.explore can still override the built-in explore and external references, permissions, and custom presets need current names. Doctor SHALL ignore tuning and user suffixes when checking managed content. Uninstall SHALL preserve custom instruction suffixes and other body changes. Historical decisions SHALL remain unchanged.

#### Scenario: Local definitions remain untouched
- **WHEN** installation finds the current project's declared retired agent and current-name managed overrides
- **THEN** it deletes the retired file and refreshes only existing current-name definitions, preserving their tuning and suffixes and leaving other projects alone

#### Scenario: Doctor accepts migrated tunables
- **WHEN** current-name definitions match managed content and carry custom tuning or suffix text
- **THEN** doctor accepts the managed identity without treating user-owned regions as divergence

#### Scenario: Uninstall protects divergent new-name files
- **WHEN** uninstall considers a renamed generic agent whose managed content was modified
- **THEN** it retains the modified file while eligible managed new-name files remain in the normal deletion inventory

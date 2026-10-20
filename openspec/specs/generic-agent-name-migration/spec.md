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

Global opencode installation SHALL map explore.md to budget-explorer.md, executor.md to budget-executor.md, and budget.md to budget-subagent.md. When a replacement is absent and its predecessor matches managed content after model and variant are excluded, installation SHALL preserve the predecessor model and optional variant, including structured model settings and intentional variant absence. Existing regular new-name destination settings SHALL take precedence and conflicting old-name settings SHALL be reported. Ownership SHALL use managed-content identity without sidecars.

#### Scenario: Owned predecessor settings survive migration

- **WHEN** an owned legacy file with customized model and optional variant exists and the replacement is absent
- **THEN** installation seeds the matching replacement with those settings, including an absent variant

#### Scenario: Existing replacement settings take precedence

- **WHEN** both legacy and regular replacement files exist with conflicting model or variant settings
- **THEN** installation keeps the replacement settings and reports the conflict

#### Scenario: Repeat installation preserves settings

- **WHEN** installation runs again after a completed migration
- **THEN** the migrated settings remain unchanged and no old-name alias is created

### Requirement: Protected migration destinations and cleanup

Installation SHALL inspect each new-name generic-agent destination before reading or writing it. A symlink, dangling symlink, directory, or other non-regular destination SHALL be skipped with a manual-review notice, leaving the destination, its target, and any predecessor unchanged. Installation SHALL remove a predecessor only after its replacement installs successfully and the predecessor is still a regular file with the same verified SAI-owned content. Modified or unrelated predecessors SHALL remain unchanged with a notice.

#### Scenario: Linked destination with predecessor

- **WHEN** a new-name destination is a symbolic link and a legacy predecessor exists
- **THEN** installation leaves the link, target, and predecessor unchanged and reports manual review

#### Scenario: Linked destination without predecessor

- **WHEN** a new-name destination is a symbolic link without a legacy predecessor
- **THEN** installation skips the destination before any read or write and leaves the target unchanged

#### Scenario: Blocked replacement does not consume predecessor

- **WHEN** a replacement destination is a directory or another non-regular entry
- **THEN** installation skips that destination and retains the predecessor so migration can resume after manual correction

#### Scenario: Modified predecessor is protected

- **WHEN** a legacy file differs in managed content or is not a regular file
- **THEN** installation preserves it and reports that a retained explore definition can still override the built-in

#### Scenario: Partial migration resumes

- **WHEN** one agent was migrated but another replacement was blocked and is later made available
- **THEN** reinstallation preserves the completed agent settings and migrates the remaining eligible predecessor

### Requirement: Manual overrides and lifecycle protection

Global installation SHALL leave project-local agent definitions and legacy configuration agent keys unchanged, report detected local legacy files and configuration keys, and document manual migration of needed overrides, external references, permissions, and custom presets. A retained explore definition or agent.explore key can still override OpenCode built-in explore. Doctor and uninstall SHALL enumerate the new names and retain managed-content protections; historical decision records SHALL remain unchanged.

#### Scenario: Local definitions remain untouched

- **WHEN** global installation detects a project-local legacy definition
- **THEN** its bytes remain unchanged and the installer reports manual migration and the possible built-in explore override

#### Scenario: Doctor accepts migrated tunables

- **WHEN** the renamed agent files match managed content but carry migrated model or variant settings
- **THEN** doctor accepts their managed identity without treating tunable differences as divergence

#### Scenario: Uninstall protects divergent new-name files

- **WHEN** uninstall considers a renamed generic agent whose managed content was modified
- **THEN** it retains the modified file while eligible managed new-name files remain in the normal deletion inventory

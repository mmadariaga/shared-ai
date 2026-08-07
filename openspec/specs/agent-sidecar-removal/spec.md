# agent-sidecar-removal Specification

## Purpose
Retirement of the owner-sidecar machinery and the legacy Claude worker migration module. Matching owner sidecars are deleted under the shape guard during install and uninstall, unrelated dotfiles are preserved, and all legacy Claude migration code and its call sites are removed.

## Requirements

### Requirement: sidecar shape guard on install

For each managed agent projection the installer processes, the installer MUST attempt to delete the file at `.<basename>.owner.json` adjacent to the destination (where `<basename>` is the destination filename without its `.md` extension) if and only if both of the following hold: the file exists, and its contents parse as a JSON object whose own enumerable keys are exactly one key named `managedHash` whose value is a 64-character lowercase hexadecimal string.

#### Scenario: matching sidecar is deleted on install
- **WHEN** a `.<basename>.owner.json` file exists adjacent to the destination
- **AND** its contents parse as a JSON object with exactly one key `managedHash` whose value matches `^[0-9a-f]{64}$`
- **THEN** the installer unlinks that sidecar file as part of the install
- **AND** the file no longer exists after the install completes

#### Scenario: sidecar with extra keys is left alone
- **WHEN** a `.<basename>.owner.json` file exists adjacent to the destination
- **AND** its contents parse as a JSON object that has the key `managedHash` plus one or more additional keys
- **THEN** the installer does not unlink that file
- **AND** the file is still present after the install completes

#### Scenario: non-sidecar dotfile is left alone when a matching sidecar is also present
- **WHEN** a managed agent destination exists with a sidecar matching the shape guard and a non-sidecar dotfile (for example, a user-created `.sai-1-spec-proposal-worker.notes`) also adjacent to the destination
- **THEN** the matching sidecar is unlinked
- **AND** the unrelated dotfile is preserved
- **AND** the destination itself is preserved (the install overwrites or reuses the destination under the tunable-seed rule)

#### Scenario: malformed sidecar is left alone
- **WHEN** a `.<basename>.owner.json` file exists adjacent to the destination
- **AND** its contents are not valid JSON
- **THEN** the installer does not unlink that file
- **AND** the file is still present after the install completes

### Requirement: bin/managed-worker-migration.js is removed

The file `bin/managed-worker-migration.js` MUST NOT exist after this change is applied. The module's public functions (`inspectManagedWorkerMigration`, `migrateManagedWorkerIdentity`) MUST NOT be imported anywhere in the repository, including by `bin/install-flow.js`, `bin/doctor.js`, `bin/uninstall-flow.js`, or any test under `test/`.

#### Scenario: the migration module is gone
- **WHEN** the repository tree is inspected
- **THEN** `bin/managed-worker-migration.js` does not exist
- **AND** no file under `bin/` or `test/` contains the literal string `require('../bin/managed-worker-migration.js')` or `require('./managed-worker-migration.js')` or `require('../../bin/managed-worker-migration.js')`

### Requirement: legacy Claude migration code is removed

The `bin/install-flow.js` file MUST NOT contain any of the following identifiers after this change is applied: `migrateLegacyClaudeWorkers`, `LEGACY_CLAUDE_WORKERS`, `migrateManagedWorkerIdentity`, `OWNER_BY_CLAUDE_AGENT`, `CLAUDE_SPEC_WORKER_OWNER`, `CLAUDE_DESIGN_WORKER_OWNER`, `CLAUDE_IMPLEMENTATION_WORKER_OWNER`, `CLAUDE_REVIEW_WORKER_OWNER`. The `MANAGED_WORKERS` registry entries MUST NOT contain a `claude.owner` field.

#### Scenario: install-flow no longer references the sidecar machinery
- **WHEN** `bin/install-flow.js` is read
- **THEN** none of the identifiers named in this requirement appear in the file
- **AND** no `MANAGED_WORKERS[name].claude` entry has a key named `owner`

#### Scenario: the legacy migration call site is gone
- **WHEN** `installClaude` is run
- **THEN** the function body does not call `migrateLegacyClaudeWorkers`
- **AND** the function does not unlink any `.<basename>.owner.json` file as part of a migration step (only the shape-guarded unlink defined in `sidecar shape guard on install` remains)

### Requirement: uninstall also removes sidecars under the shape guard

When the uninstall flow deletes a managed agent file under the body-and-non-tunable identity rule, the uninstall flow MUST also unlink the adjacent `.<basename>.owner.json` sidecar under the same shape guard as the install-time deletion: the file must exist, and its contents must parse as a JSON object whose own enumerable keys are exactly one key named `managedHash` whose value is a 64-character lowercase hexadecimal string. Sidecars that match the filename but not the shape are left untouched. This requirement ensures users who upgrade from a pre-change installation — where every managed agent has a sidecar — leave no residue when they uninstall shared-AI.

#### Scenario: pre-change sidecar is removed alongside its agent
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source
- **AND** an adjacent `.<basename>.owner.json` sidecar exists whose contents parse as a JSON object with only a `managedHash` key whose value is a 64-character lowercase hexadecimal string
- **THEN** uninstall SHALL unlink the sidecar alongside the destination

#### Scenario: uninstall-time sidecar with extra keys is left alone
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source
- **AND** an adjacent `.<basename>.owner.json` sidecar exists whose contents parse as a JSON object that has the `managedHash` key plus one or more additional keys
- **THEN** uninstall SHALL remove the destination agent file
- **AND** SHALL leave the sidecar in place

#### Scenario: uninstall-time malformed sidecar is left alone
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source
- **AND** an adjacent `.<basename>.owner.json` sidecar exists whose contents are not valid JSON
- **THEN** uninstall SHALL remove the destination agent file
- **AND** SHALL leave the sidecar in place

#### Scenario: uninstall-time non-sidecar dotfile is left alone
- **WHEN** uninstall evaluates a destination whose body and non-tunable frontmatter match the source
- **AND** a non-sidecar dotfile (for example, a user-created `.sai-1-spec-proposal-worker.notes`) exists adjacent to the destination
- **THEN** uninstall SHALL remove the destination agent file
- **AND** SHALL leave the non-sidecar dotfile in place

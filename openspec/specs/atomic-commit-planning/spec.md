# atomic-commit-planning Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Atomic grouping of contract-breaking changes

When a step changes a function signature, removes an exported symbol, renames a public API, or alters any contract that other files depend on, the step MUST include all files that reference that contract — callers, consumers, re-exporters, and the tests that use the contract — in the same "Files Affected" list, with the `compile` or `runtime` failures of those tests recorded under `**Existing Tests Broken**`.

Such a change SHALL NOT be planned as a standalone step that leaves a caller for a later step.

#### Scenario: Signature change with callers

- **WHEN** a step modifies a function signature (parameter types, return type, parameter count)
- **THEN** the same step lists every file that calls or imports that function, tests included, under "Files Affected"

#### Scenario: Export removal

- **WHEN** a step removes an exported symbol (function, class, type, constant)
- **THEN** every file that imports that symbol, tests included, is listed under that step's "Files Affected" so it is updated or switched to a replacement in the same step

#### Scenario: API rename

- **WHEN** a step renames a public API or module path
- **THEN** all consumers of the old name are listed under that step's "Files Affected" and migrated to the new name within the same step

### Requirement: Files Affected lists every file a step changes

In `tasks.md`, a step's `**Files Affected**` SHALL list every file the step creates, modifies, deletes, or renames, tests included: the production and test files its RED and GREEN work will write and the files it retires. `/sai-3-implement` SHALL compare each step's changed files with this list and report any path its steps change that the list omits. `sai/tools/file-manifest.js` folds every step's `**Files Affected**` entries into the change's file manifest.

#### Scenario: Step writes a new test file
- **WHEN** a step's RED work creates a test file and its GREEN work creates a production file
- **THEN** both files are listed under that step's `**Files Affected**`

#### Scenario: Step retires a file
- **WHEN** a step deletes an obsolete test file
- **THEN** that file is listed under the step's `**Files Affected**`

### Requirement: Each Step is one implementation cycle

In `tasks.md`, each `## Step N` SHALL be one RED, GREEN, review, and commit cycle that delivers one testable behavior the implementer can finish and commit on its own. The design task-generation step SHALL bind the plan with exactly two commit atomicity rules, this one and the grouping of contract-breaking changes, and SHALL NOT carry a static buildability checklist or lint reasoning. `/sai-3-implement` SHALL choose and regroup its own steps from execution evidence and record any regrouping as a deviation.

#### Scenario: The commit atomicity section holds two rules

- **WHEN** `sai/commands/design/steps/tasks.md` is read at its commit atomicity section
- **THEN** it states the one-cycle-per-Step rule and the contract-breaking grouping rule, and no buildability checklist

# atomic-commit-planning Specification

## Purpose

Defines how the design phase groups implementation steps so each step is one implementation cycle, lists every file it changes, and keeps contract-breaking changes atomic.

## Requirements

### Requirement: Atomic grouping of contract-breaking changes

When a step changes a function signature, removes an exported symbol, renames a public API, or alters any contract that other files depend on, the same step MUST deliver every file that references that contract: production callers and consumers are updated by its GREEN, existing tests of the old contract are updated by the plan RED inside its bound, and files that no test pins go to a step without tests that lists them under its `**Files Affected**`. No `**Existing Tests Broken**` field records them.

Such a change SHALL NOT be planned as a standalone step that leaves a caller for a later step.

#### Scenario: Signature change with callers

- **WHEN** a step modifies a function signature (parameter types, return type, parameter count)
- **THEN** the same step delivers every production caller through its GREEN and every existing test of the old signature through the plan RED

#### Scenario: Export removal

- **WHEN** a step removes an exported symbol (function, class, type, constant)
- **THEN** every file that imports that symbol is updated or switched to a replacement in the same step: production files by its GREEN, tests by the plan RED

#### Scenario: API rename

- **WHEN** a step renames a public API or module path
- **THEN** all consumers of the old name are migrated to the new name within the same step, and documentation no test pins goes to a step without tests that lists it

### Requirement: Files Affected lists every file a step changes

In `tasks.md`, only a step without tests SHALL carry `**Files Affected**`, and it SHALL list every file that step creates, modifies, deletes, or renames. A step with tests SHALL carry no `**Files Affected**`: its files are made known by the `path :: signature` entries of `design.md` `## Target State` and by the tests that the write-back records under `**Tests**`. `/sai-3-implement` SHALL compare each step's changed files with what the plan makes known (the `path :: signature` entries, the tests of `**Tests**`, and the `**Files Affected**` of steps without tests) and report any path its steps change that none of them names. `sai/tools/file-manifest.js` folds the `**Files Affected**` entries of the steps without tests into the change's file manifest.

#### Scenario: Step writes a new test file
- **WHEN** the plan RED creates a test file for a step with tests and GREEN writes the production file of a `path :: signature` entry
- **THEN** the step carries no `**Files Affected**`, the test file is listed under its `**Tests**` after the write-back, and the production file is named by the `path :: signature` entry

#### Scenario: Step retires a file
- **WHEN** a step without tests deletes an obsolete file
- **THEN** that file is listed under the step's `**Files Affected**` with the `D` token

### Requirement: Each Step is one implementation cycle

In `tasks.md`, each `## Step N` SHALL be one GREEN, review, and commit cycle over its plan tests that delivers one testable behavior the implementer can finish and commit on its own. The design task-generation step SHALL bind the plan with exactly three rules: one cycle per Step, the grouping of contract-breaking changes, and every behavior named by a scenario or the step closed by a criterion. It SHALL NOT carry a static buildability checklist or lint reasoning. `/sai-3-implement` SHALL choose and regroup its own steps from execution evidence and record any regrouping as a deviation.

#### Scenario: The commit atomicity section holds two rules

- **WHEN** `sai/commands/design/steps/tasks.md` is read at its commit atomicity section
- **THEN** it states the one-cycle-per-Step rule, the contract-breaking grouping rule, and the scenario-or-closure rule, and no buildability checklist

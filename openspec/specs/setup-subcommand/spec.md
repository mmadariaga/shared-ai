## Purpose

This capability defines the setup CLI entry point, project-path resolution, and ordered prerequisite and schema initialization sequence.

## Requirements

### Requirement: setup-entry
`bin/setup.js` SHALL be the entry point for the `setup` subcommand. It MUST be a pure module — it SHALL NOT call `process.exit` or produce side effects when required; execution MUST be guarded by an `if (require.main === module)` or equivalent entry guard.

#### Scenario: module guard
- **WHEN** `bin/setup.js` is `require()`-d from `bin/install.js`
- **THEN** no side effects occur; the module only exports its public API

#### Scenario: direct execution
- **WHEN** `bin/setup.js` is the entry point (e.g., via dispatcher)
- **THEN** it begins the setup flow

### Requirement: path-resolution
When invoked as `npx shared-ai setup [path]`, `bin/setup.js` SHALL resolve the target project path as follows:

- If a positional argument is provided, use it as `projectPath` (resolved relative to `process.cwd()`)
- If no argument is provided, default to `process.cwd()`

In both cases setup SHALL print `Configuring SAI workflow at <projectPath>` and proceed directly to the prerequisite checks; the only confirmations are the ones those steps ask for (`openspec init`, the `schema: sai-workflow` line).

#### Scenario: explicit path
- **WHEN** user runs `npx shared-ai setup /some/project`
- **THEN** `projectPath` is `/some/project` and setup prints `Configuring SAI workflow at /some/project`

#### Scenario: no path
- **WHEN** user runs `npx shared-ai setup` without a path
- **THEN** `projectPath` is `process.cwd()`, setup prints `Configuring SAI workflow at <cwd>`, and proceeds to the prerequisite checks

### Requirement: setup-sequence
`bin/setup.js` SHALL execute the setup steps in this order, stopping on the first failure:
1. `openspec-check` — verify openspec CLI in PATH
2. `openspec-init-guard` — ensure `{projectPath}/openspec/` exists
3. `schema-update` — ensure `{projectPath}/openspec/config.yaml` declares `schema: sai-workflow`
4. `schema-copy` — copy schema templates into `{projectPath}/openspec/schemas/sai-workflow/`

#### Scenario: full success
- **WHEN** all steps complete without error
- **THEN** prints `"SAI workflow configured at <projectPath>."` and exits 0

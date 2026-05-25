## ADDED Requirements

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
- If no argument is provided, default to `process.cwd()` and display the resolved absolute path, then prompt the user: `"Configure SAI workflow at <projectPath>? (Y/n)"` — if the user declines, print `"Aborted."` and exit 0

#### Scenario: explicit path
- **WHEN** user runs `npx shared-ai setup /some/project`
- **THEN** `projectPath` is `/some/project`; no confirmation prompt

#### Scenario: no path, user confirms
- **WHEN** user runs `npx shared-ai setup` and confirms with `Y` or Enter
- **THEN** `projectPath` is `process.cwd()` and setup continues

#### Scenario: no path, user declines
- **WHEN** user runs `npx shared-ai setup` and inputs `n` or `N`
- **THEN** prints `"Aborted."` and exits 0

### Requirement: setup-sequence
`bin/setup.js` SHALL execute the setup steps in this order, stopping on the first failure:
1. `openspec-check` — verify openspec CLI in PATH
2. `openspec-init-guard` — ensure `{projectPath}/openspec/` exists
3. `schema-update` — ensure `{projectPath}/openspec/config.yaml` declares `schema: sai-workflow`
4. `schema-copy` — copy schema templates into `{projectPath}/openspec/schemas/sai-workflow/`

#### Scenario: full success
- **WHEN** all steps complete without error
- **THEN** prints `"SAI workflow configured at <projectPath>."` and exits 0

## MODIFIED Requirements

## REMOVED Requirements

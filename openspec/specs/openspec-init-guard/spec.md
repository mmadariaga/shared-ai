## ADDED Requirements

### Requirement: openspec-dir-check
After a successful `openspec-check`, `bin/setup.js` SHALL verify that the directory `{projectPath}/openspec/` exists.

#### Scenario: directory exists
- **WHEN** `{projectPath}/openspec/` exists
- **THEN** the guard passes silently and setup continues

#### Scenario: directory missing, user accepts init
- **WHEN** `{projectPath}/openspec/` does not exist
- **THEN** prints `"openspec/ not found at <projectPath>. Run 'openspec init'? (Y/n)"`, waits for input, and on `Y`/Enter spawns `openspec init` with `{ cwd: projectPath }` and waits for it to complete before continuing

#### Scenario: directory missing, user declines init
- **WHEN** `{projectPath}/openspec/` does not exist and user inputs `n`/`N`
- **THEN** prints `"Aborted."` and exits 0

#### Scenario: openspec init fails
- **WHEN** spawned `openspec init` exits with non-zero code
- **THEN** prints the process stderr output and exits with code 1

### Requirement: spawn-cwd
The `openspec init` spawn MUST use `{ cwd: projectPath }` as the spawn option. `process.chdir` SHALL NOT be called at any point in `bin/setup.js`.

#### Scenario: spawn options
- **WHEN** `openspec init` is spawned
- **THEN** the child process `cwd` is `projectPath`, not `process.cwd()`

## MODIFIED Requirements

## REMOVED Requirements

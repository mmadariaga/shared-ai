## ADDED Requirements

### Requirement: doctor subcommand routing

`bin/install.js` SHALL route the `doctor` subcommand to `bin/doctor.js`, alongside the existing `install`, `setup`, and `uninstall` routes. The router SHALL invoke the module and exit with the code it returns, mirroring the existing subcommand routing. The installer's usage line and its unknown-subcommand error message SHALL both name `doctor` as a valid subcommand (i.e. `[install|setup|uninstall|doctor]`).

#### Scenario: doctor routes to the doctor module
- **WHEN** a user runs `npx github:mmadariaga/shared-ai doctor`
- **THEN** `bin/install.js` invokes `bin/doctor.js` rather than the install, setup, or uninstall flow

#### Scenario: unknown subcommand still errors
- **WHEN** a user runs the CLI with a subcommand that is not `install`, `setup`, `uninstall`, or `doctor`
- **THEN** the CLI prints an unknown-subcommand message listing the valid subcommands (including `doctor`) and exits non-zero

#### Scenario: help text lists doctor
- **WHEN** a user runs the CLI with `--help`
- **THEN** the printed usage line names `doctor` alongside `install`, `setup`, and `uninstall`

### Requirement: no-dependency built-ins-only implementation

`bin/doctor.js` SHALL begin with `#!/usr/bin/env node` and SHALL use only Node.js built-in modules (such as `fs`, `path`, `os`, `https`). It SHALL NOT require any package from `package.json` `dependencies` nor any third-party module, so the `npx` invocation resolves and runs without additional install steps.

#### Scenario: doctor runs with no third-party modules
- **WHEN** `bin/doctor.js` is executed under `npx github:mmadariaga/shared-ai doctor`
- **THEN** it completes using only Node built-in modules, requiring no dependency beyond the Node runtime

### Requirement: read-only diagnosis

The doctor SHALL NOT create, modify, or delete any file in the user's harness user-global dirs or in the project. Its only outbound effect SHALL be network reads (fetching the latest `package.json` and, when needed, the fresh repo file inventory). It SHALL diagnose and recommend fixes (e.g. re-run the installer, run `openspec init`) but SHALL NOT apply any fix.

#### Scenario: doctor leaves the filesystem unchanged
- **WHEN** the doctor runs against any install state (healthy, partial, or corrupt)
- **THEN** no file under any harness user-global dir or the project is created, modified, or deleted

#### Scenario: doctor recommends but does not fix
- **WHEN** the doctor detects a missing or broken piece
- **THEN** it names the piece and recommends the corrective command without performing the correction

### Requirement: sectioned output and aggregate exit code

The doctor SHALL report each detected harness in its own labeled section plus a `[Project health]` section. It SHALL exit `0` when every check passes (green) and `1` when any check fails (red), so the exit code is usable in CI.

#### Scenario: healthy install exits zero
- **WHEN** every harness section and the `[Project health]` section pass all checks
- **THEN** the doctor prints the labeled sections and exits with code `0`

#### Scenario: any failure exits one
- **WHEN** at least one check in any section fails
- **THEN** the doctor exits with code `1`

### Requirement: json output flag

The doctor SHALL accept a `--json` flag that emits the same diagnostic result as machine-readable JSON instead of the human-readable sectioned report. The aggregate exit code SHALL be identical in both modes.

#### Scenario: json flag emits machine-readable output
- **WHEN** a user runs `npx github:mmadariaga/shared-ai doctor --json`
- **THEN** the doctor prints a JSON document describing each harness section and the project-health section, and exits with the same code it would in human-readable mode

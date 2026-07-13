## Requirements

### Requirement: Per-project index bootstrap via ensureCodegraphIndex

`bin/setup.js` SHALL expose an `ensureCodegraphIndex(projectPath)` step that bootstraps the CodeGraph per-project index, mirroring how `ensureOpenspecDir()` bootstraps `openspec/`. It SHALL run the non-interactive `codegraph init` command only when BOTH conditions hold: a `.codegraph/` directory is absent at the project path AND the `codegraph` binary is present on PATH. When `.codegraph/` already exists the step SHALL take no action and return. When the `codegraph` binary is absent the step SHALL cleanly skip `codegraph init` (taking no action) rather than attempting it and emitting a confusing spawn failure — the binary may be absent because a non-TTY soft-offer only printed the install commands without installing. Binary presence SHALL be detected with the same shell/`PATHEXT`-resolving probe used by `offerCodegraphInstall()` (e.g. `codegraph --version` via `spawnSync` with `shell: true`), so a Windows `.cmd` shim is not misclassified as absent. The command SHALL be `codegraph init` (the non-interactive form) — NOT the interactive `codegraph init -i` form that `explore-codegraph-fallback-notice` recommends to humans — and SHALL be run with `cwd` = the project path so the index is created at the project root, mirroring `ensureOpenspecDir()`'s `spawnSync('openspec', ['init'], { cwd: projectPath, ... })`.

#### Scenario: Index absent and binary present — init runs at project root
- **WHEN** `ensureCodegraphIndex(projectPath)` runs, no `.codegraph/` directory exists at `projectPath`, and the `codegraph` binary is present on PATH
- **THEN** it runs `codegraph init` with `cwd` set to `projectPath`

#### Scenario: Index absent but binary absent — init cleanly skipped
- **WHEN** `ensureCodegraphIndex(projectPath)` runs, no `.codegraph/` directory exists at `projectPath`, and the `codegraph` binary is absent from PATH
- **THEN** it does not attempt `codegraph init` (no spawn failure is emitted) and returns without aborting

#### Scenario: Index already present — no action
- **WHEN** `ensureCodegraphIndex(projectPath)` runs and a `.codegraph/` directory already exists at `projectPath`
- **THEN** it takes no action and does not run `codegraph init`

#### Scenario: Non-interactive form is used
- **WHEN** `ensureCodegraphIndex(projectPath)` runs `codegraph init`
- **THEN** it uses the plain non-interactive `codegraph init` command, not `codegraph init -i`

### Requirement: Shared offer reused as a soft prerequisite in setup

`bin/setup.js` SHALL reuse the shared `offerCodegraphInstall()` helper (from `installer-codegraph-cli-bootstrap`) as a soft prerequisite before the per-project index bootstrap, so a standalone `setup` run can bootstrap the missing `codegraph` CLI. The reuse SHALL rely on the single shared helper rather than a duplicated copy of the offer logic. Because `codegraph init` requires the `codegraph` binary on PATH, the soft-offer SHALL be given the opportunity to run before `ensureCodegraphIndex()` attempts init.

#### Scenario: Standalone setup offers the CLI before init
- **WHEN** `setup.js` runs standalone and the `codegraph` binary is absent
- **THEN** the shared `offerCodegraphInstall()` helper is invoked before `ensureCodegraphIndex()` attempts `codegraph init`

#### Scenario: Single shared helper, no duplication
- **WHEN** `setup.js` needs the CodeGraph install offer
- **THEN** it uses the one shared `offerCodegraphInstall()` helper rather than a duplicated offer implementation

### Requirement: Codegraph bootstrap is non-blocking in setup

Neither `ensureCodegraphIndex()` nor the soft-offer it invokes SHALL block `setup.js`: they SHALL NOT call `process.exit` when the `codegraph` binary is missing, when the offer is declined, or when `codegraph init` fails. This deliberately differs from `ensureOpenspecDir()` and `checkOpenspecCli()`, which abort with `process.exit` — CodeGraph is optional, so a project SHALL be able to complete setup with no `codegraph` binary and no `.codegraph/` index.

#### Scenario: Missing binary does not abort setup
- **WHEN** `setup.js` runs and the `codegraph` binary is absent and the offer is declined or unavailable (non-TTY)
- **THEN** setup does not call `process.exit` on that account and completes normally, leaving the project without a CodeGraph index

#### Scenario: Failed init does not abort setup
- **WHEN** `ensureCodegraphIndex()` runs `codegraph init` and it exits with a failure
- **THEN** setup does not abort or call `process.exit` and completes the remainder of its work

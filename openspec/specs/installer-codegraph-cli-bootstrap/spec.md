## Requirements

### Requirement: Codegraph binary detection

`install-flow.js` SHALL expose a reusable `offerCodegraphInstall()` helper that first probes for the `codegraph` binary by invoking it with `--version`. A successful invocation (process spawns and exits zero) SHALL be treated as **present**; a spawn failure (binary not found) or a non-zero exit SHALL be treated as **absent**. The probe SHALL resolve `codegraph` through the platform's executable PATH resolution, including Windows `PATHEXT` / `.cmd` shim resolution, by using `childProcess.spawnSync('codegraph --version', { shell: true, stdio: 'ignore' })` — a single hardcoded string literal with `shell: true`, NOT the array-args form (the same DEP0190-silencing, `.cmd`-resolving rationale as the `opencode` probe in `installer-opencode-cli-bootstrap`). The probe detects only the CLI binary, NOT whether the codegraph MCP has been wired into the user's agents (the separable step-2 state); the CLI-present case is handled by the wiring-hint requirement below rather than by returning silently.

#### Scenario: Binary responds to version probe
- **WHEN** `offerCodegraphInstall()` runs and the `codegraph --version` probe spawns and exits zero
- **THEN** the helper treats the binary as present and proceeds to the CLI-present MCP-wiring hint behavior (it does not prompt or execute any command)

#### Scenario: Binary not found on PATH
- **WHEN** `offerCodegraphInstall()` runs and the `codegraph --version` probe fails because the binary cannot be found on PATH
- **THEN** the helper treats the binary as absent and proceeds to the offer/print behavior

#### Scenario: Binary present but errors
- **WHEN** `offerCodegraphInstall()` runs and the `codegraph --version` probe spawns but exits non-zero
- **THEN** the helper treats the binary as absent and proceeds to the offer/print behavior

#### Scenario: Installed Windows binary is a .cmd shim
- **WHEN** `offerCodegraphInstall()` runs on Windows and `codegraph` is installed as a global npm `.cmd` shim on PATH
- **THEN** the probe resolves it through `PATHEXT`/shell resolution and treats the binary as present, rather than misclassifying it as absent

### Requirement: CLI-present MCP-wiring hint

Because the `codegraph --version` probe can confirm the CLI is present but cannot cheaply determine whether the codegraph MCP has been wired into the user's agents (step 2, `codegraph install`), the helper SHALL close the "inert CLI" gap without reimplementing codegraph's per-agent detection. When the binary is **present**, `offerCodegraphInstall()` SHALL print a single-line, print-only wiring hint naming the exact command — `MCP wiring: run \`codegraph install\` if not already wired` — and then return. This branch SHALL be a hint only: it SHALL NOT prompt the user (regardless of TTY) and SHALL NOT execute any command, since `codegraph install` is auto-detect and idempotent so re-running is a no-op, and prompting the already-wired majority on every install run would only nag. The interactive prompt SHALL be reserved for the CLI-absent case where action is known to be required.

#### Scenario: CLI present on a TTY prints the wiring hint without prompting
- **WHEN** the `codegraph` binary is present and a TTY is present
- **THEN** the helper prints the one-line wiring hint naming `codegraph install`, issues no prompt, executes nothing, and returns

#### Scenario: CLI present without a TTY prints the wiring hint
- **WHEN** the `codegraph` binary is present and no TTY is present
- **THEN** the helper prints the same one-line wiring hint naming `codegraph install`, executes nothing, and returns

### Requirement: Bundled two-step interactive install offer on a TTY

When the `codegraph` binary is absent AND `process.stdin.isTTY` is truthy, `offerCodegraphInstall()` SHALL prompt the user to install CodeGraph. On an affirmative answer the helper SHALL run the two global setup steps in order: first `npm i -g @colbymchenry/codegraph` (the CLI), then `codegraph install` (the MCP-wiring step). Both commands SHALL be run via `childProcess.spawnSync(<string literal>, { shell: true, stdio: 'inherit' })` — single hardcoded string literals with `shell: true`, NOT the array-args form, for the same DEP0190 rationale as the sibling opencode bootstrap. The two steps SHALL be bundled — the CLI install alone is inert until `codegraph install` wires the MCP — so the helper SHALL NOT offer the CLI install without also running (or, on decline/failure, printing) the `codegraph install` step. On a negative answer the helper SHALL instead print both exact commands for the user to run manually.

#### Scenario: Missing binary, TTY present, user confirms
- **WHEN** the binary is absent, a TTY is present, and the user confirms the install offer
- **THEN** the helper runs `npm i -g @colbymchenry/codegraph` and then `codegraph install`

#### Scenario: Missing binary, TTY present, user declines
- **WHEN** the binary is absent, a TTY is present, and the user declines the install offer
- **THEN** the helper executes no install command and prints both exact commands — `npm i -g @colbymchenry/codegraph` and `codegraph install` — for the user to run manually

### Requirement: CI-safe print-only fallback without a TTY

When the `codegraph` binary is absent AND `process.stdin.isTTY` is falsy (CI, piped, non-interactive), `offerCodegraphInstall()` SHALL print both exact commands — `npm i -g @colbymchenry/codegraph` and `codegraph install` — and SHALL NOT prompt the user and SHALL NOT execute any command.

#### Scenario: Missing binary, no TTY
- **WHEN** the binary is absent and no TTY is present
- **THEN** the helper prints both exact commands, issues no prompt, and executes nothing

### Requirement: Install-command failure is non-blocking and prints manual commands

`offerCodegraphInstall()` SHALL be non-blocking: it SHALL NOT call `process.exit` on a missing binary, a declined offer, or a failed install — deliberately unlike the `openspec` hard gate (`checkOpenspecCli`), because CodeGraph is optional and `sai-explore` falls back to grep when it is absent. When an executed install command exits with a failure, the helper SHALL print both exact manual commands — `npm i -g @colbymchenry/codegraph` and `codegraph install` — so the user can complete the setup by hand, rather than failing silently or aborting.

#### Scenario: Declined offer does not abort the installer
- **WHEN** the binary is absent and the user declines the offer
- **THEN** the helper returns without aborting and the surrounding install flow continues normally

#### Scenario: Install command failure prints manual commands and does not abort
- **WHEN** an executed install command exits with a failure
- **THEN** the helper does not abort or call `process.exit`, and prints both exact manual commands `npm i -g @colbymchenry/codegraph` and `codegraph install`

### Requirement: Helper and command constants are exported; offer invoked once, editor-agnostic

`offerCodegraphInstall()` SHALL be added to the `module.exports` of `install-flow.js` so `setup.js` and tests can reuse it. The two global install command strings — `npm i -g @colbymchenry/codegraph` and `codegraph install` — SHALL be defined as named exported constants (mirroring the exported `OPENCODE_INSTALL_CMD` that `test/install-opencode.test.js` asserts against) rather than only as inline literals, so the new tests can assert against the exported constants for parity with the opencode tests. Within the install flow the offer SHALL be invoked exactly once and SHALL be editor-agnostic — it SHALL NOT be nested inside the Opencode install branch (or any other single-editor branch), because CodeGraph is independent of which SAI editor targets the user selected. This placement deliberately differs from `offerOpencodeInstall()`, which runs only inside the Opencode branch. The exact constant names are an implementation detail left to `/sai-2-design`.

#### Scenario: Offer runs regardless of selected editors
- **WHEN** the install flow runs with any combination of selected editor targets, including a selection that excludes Opencode
- **THEN** `offerCodegraphInstall()` is invoked exactly once, outside any single-editor branch

#### Scenario: Helper and command constants are exported for reuse
- **WHEN** `setup.js` or a test requires `install-flow.js`
- **THEN** `offerCodegraphInstall` and the named constants for `npm i -g @colbymchenry/codegraph` and `codegraph install` are available on the module's exports

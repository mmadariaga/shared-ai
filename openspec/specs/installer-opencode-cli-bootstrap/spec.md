## ADDED Requirements

### Requirement: Opencode binary detection

During the Opencode install branch, the installer SHALL probe for the `opencode` binary by invoking it with `--version`. A successful invocation (process spawns and exits zero) SHALL be treated as **present**. A spawn failure (binary not found) or a non-zero exit SHALL be treated as **absent**. The probe SHALL resolve `opencode` through the platform's executable PATH resolution, **including Windows `PATHEXT` / `.cmd` shim resolution** — as `bin/setup.js` already does for `openspec` (via a `where`/`which` lookup and/or spawning with `shell: true`). A probe that bypasses shell/`PATHEXT` resolution (e.g. a bare `spawnSync('opencode', […])` without `shell: true`) SHALL NOT be used, because on Windows it throws `ENOENT` for globally-installed npm `.cmd` shims and would misclassify an installed binary as absent. The probe SHALL NOT read or infer presence from the existence of the `~/.config/opencode/` directory, because that proves the installer ran once, not that the binary is installed.

The probe SHALL use `childProcess.spawnSync('opencode --version', { shell: true, stdio: 'ignore' })` — a single hardcoded string literal (`'opencode --version'`) with `shell: true`, NOT the array-args form. DEP0190 is specifically triggered by `shell: true` combined with array args; a string literal with no metacharacters bypasses the deprecation while `cmd.exe` continues to resolve `.cmd`/`.bat` shims on Windows.

#### Scenario: Binary responds to version probe
- **WHEN** the Opencode branch runs and the `opencode --version` probe spawns and exits zero
- **THEN** the installer treats the binary as present and takes no bootstrap action (no prompt, no printed command, no execution)

#### Scenario: Binary not found on PATH
- **WHEN** the Opencode branch runs and the `opencode --version` probe fails because the binary cannot be found on PATH
- **THEN** the installer treats the binary as absent and proceeds to the offer/print behavior

#### Scenario: Binary present but errors
- **WHEN** the Opencode branch runs and the `opencode --version` probe spawns but exits non-zero
- **THEN** the installer treats the binary as absent and proceeds to the offer/print behavior

#### Scenario: Installed Windows binary is a .cmd shim
- **WHEN** the Opencode branch runs on Windows and `opencode` is installed as a global npm `.cmd` shim on PATH
- **THEN** the probe resolves it through `PATHEXT`/shell resolution and treats the binary as present, rather than misclassifying it as absent

### Requirement: Interactive install offer on a TTY

When the `opencode` binary is absent AND `process.stdin.isTTY` is truthy, the installer SHALL prompt the user with `Install opencode now? [y/n]` using the readline line-interface. On an affirmative answer the installer SHALL run the documented install command via `childProcess.spawnSync('npm i -g opencode-ai@latest', { shell: true, stdio: 'inherit' })` — a single hardcoded string literal with `shell: true`, NOT the array-args form, for the same DEP0190-silencing rationale as the opencode probe. On a negative answer the installer SHALL instead print the exact install command for the user to run manually. The install command SHALL be `npm i -g opencode-ai@latest`.

#### Scenario: Missing binary, TTY present, user confirms
- **WHEN** the binary is absent, a TTY is present, and the user answers yes to `Install opencode now? [y/n]`
- **THEN** the installer runs `npm i -g opencode-ai@latest`

#### Scenario: Missing binary, TTY present, user declines
- **WHEN** the binary is absent, a TTY is present, and the user answers no to `Install opencode now? [y/n]`
- **THEN** the installer does not execute any install command and prints the exact command `npm i -g opencode-ai@latest` for the user to run manually

### Requirement: CI-safe print-only fallback without a TTY

When the `opencode` binary is absent AND `process.stdin.isTTY` is falsy (CI, piped, non-interactive), the installer SHALL print the exact install command `npm i -g opencode-ai@latest` and SHALL NOT prompt the user and SHALL NOT execute any install command.

#### Scenario: Missing binary, no TTY
- **WHEN** the binary is absent and no TTY is present
- **THEN** the installer prints the exact command `npm i -g opencode-ai@latest`, issues no prompt, and executes nothing

### Requirement: Bootstrap is non-blocking for the file-copy

The binary detection and install offer SHALL run only within the Opencode install branch and SHALL be independent of the file-copy that populates `~/.config/opencode/`. The file-copy SHALL run regardless of the detection or install outcome, and a declined, failed, or skipped install SHALL NOT abort the installer or prevent the file-copy from completing. When an executed install command exits with a failure, the installer SHALL print the exact manual command `npm i -g opencode-ai@latest` so the user can complete the install by hand, rather than failing silently.

#### Scenario: File-copy runs when binary is absent and install is declined
- **WHEN** the Opencode branch runs, the binary is absent, and the user declines the install offer
- **THEN** the SAI file-copy into `~/.config/opencode/` still completes normally

#### Scenario: Install command failure does not abort the installer
- **WHEN** the install command is executed and exits with a failure
- **THEN** the installer does not abort, prints the exact manual command `npm i -g opencode-ai@latest`, and the SAI file-copy still completes normally

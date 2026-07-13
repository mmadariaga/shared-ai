## MODIFIED Requirements

### Requirement: install script overwrites command wrappers on reinstall

The install script SHALL use `copy` (not `copyWithWarn` and not `copySkipIfExists`) when copying command wrapper files from `commands/claude/` and `commands/opencode/` and prompt files from `commands/copilot/` to their respective user-level destinations, so that reinstalls update stale wrappers and prompts without emitting any per-file log line.

#### Scenario: Claude Code command wrapper reinstall
- **WHEN** `installClaude()` runs and a wrapper file already exists in `~/.claude/commands/`
- **THEN** the file is overwritten with the repo version and no per-file `Overwriting`, `Creating`, or `Skipping` line is emitted

#### Scenario: OpenCode command wrapper reinstall
- **WHEN** `installOpencode()` runs and a wrapper file already exists in `~/.config/opencode/commands/`
- **THEN** the file is overwritten with the repo version and no per-file `Overwriting`, `Creating`, or `Skipping` line is emitted

#### Scenario: Copilot prompt reinstall
- **WHEN** `installCopilot()` runs and a prompt file already exists in the Copilot prompts destination
- **THEN** the file is overwritten with the repo version and no per-file `Overwriting`, `Creating`, or `Skipping` line is emitted

## ADDED Requirements

### Requirement: install script emits no per-file log line for any file copy

The install functions `installClaude()`, `installOpencode()`, and `installCopilot()` SHALL NOT emit any per-file log line (no `Overwriting <path>`, no `Creating <path>`, no `Skipping <path>`) while copying wrapper, command, instruction, skill, or agent files. The installer is a declarative repo-to-user-global sync, not a file-by-file installer; the per-harness summary lines printed by `main()` and the `copyOpencodeConfig` agent-key merge notice are the only per-harness feedback the user needs.

#### Scenario: Claude Code install emits no per-file log
- **WHEN** `installClaude()` is invoked
- **THEN** no `Overwriting`, `Creating`, or `Skipping` line is emitted per file during the copy loop

#### Scenario: Opencode install emits no per-file log
- **WHEN** `installOpencode()` is invoked
- **THEN** no `Overwriting`, `Creating`, or `Skipping` line is emitted per file during the copy loop

#### Scenario: Copilot install emits no per-file log
- **WHEN** `installCopilot()` is invoked
- **THEN** no `Overwriting`, `Creating`, or `Skipping` line is emitted per file during the copy loop

#### Scenario: per-harness summary lines are preserved
- **WHEN** `installClaude()`, `installOpencode()`, or `installCopilot()` returns
- **THEN** `main()` continues to print the per-harness summary block (`<Harness> commands installed to: <path>` and the matching SAI and skills lines) and the shared `Reminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow.` line as the final line of `main()`

#### Scenario: copyOpencodeConfig merge notice is preserved
- **WHEN** `copyOpencodeConfig()` writes agent keys to `opencode.json` or `opencode.jsonc`
- **THEN** it continues to print `Added opencode agent keys to <path>: <keys>. Adjust the placeholder model "<model>" to your preferred low-cost provider.`

### Requirement: install script does not export copyWithWarn or copySkipIfExists

The `install-flow.js` module SHALL NOT export `copyWithWarn` or `copySkipIfExists`; both helper functions are removed. The only file-copy helper the module exports for external consumers is `copy`.

#### Scenario: module exports list omits the removed helpers at runtime
- **WHEN** `require('bin/install-flow.js')` is evaluated
- **THEN** `typeof require('bin/install-flow.js').copyWithWarn === 'undefined'` and `typeof require('bin/install-flow.js').copySkipIfExists === 'undefined'`

### Requirement: copy helper semantics

The `copy(src, dest)` helper exported by `install-flow.js` SHALL overwrite an existing file at `dest` and SHALL create missing parent directories on demand. It SHALL emit no per-file log line. This is the only file-copy helper used by the install functions after `copyWithWarn` and `copySkipIfExists` are removed.

#### Scenario: copy overwrites an existing destination
- **WHEN** `copy(src, dest)` is called and `dest` already exists
- **THEN** the file at `dest` is overwritten with the contents of `src` and no per-file log line is emitted

#### Scenario: copy creates missing parent directories
- **WHEN** `copy(src, dest)` is called and the parent of `dest` does not exist
- **THEN** the parent directory is created and the file is copied into it, with no per-file log line emitted

### Requirement: install script behavior is uniform across Claude Code, Opencode, and GitHub Copilot

`installClaude()`, `installOpencode()`, and `installCopilot()` SHALL use the same file-copy helper (`copy`) and SHALL all overwrite existing destination files on reinstall for every file type the function handles (wrappers, commands, instructions, skills, and agents). The harness-specific install functions SHALL differ only in source paths, destination paths, and the per-harness summary lines they cause `main()` to print — not in copy semantics. This is the harness-universality invariant: a user re-running the installer against any combination of the three harnesses sees identical silent-overwrite behavior.

#### Scenario: Claude Code install overwrites every file type silently
- **WHEN** `installClaude()` runs and a wrapper, command, instruction, or skill file already exists at its destination
- **THEN** every such file is overwritten with the repo version and no per-file log line is emitted

#### Scenario: Opencode install overwrites every file type silently
- **WHEN** `installOpencode()` runs and a wrapper, command, instruction, or skill file already exists at its destination
- **THEN** every such file is overwritten with the repo version and no per-file log line is emitted

#### Scenario: Copilot install overwrites every file type silently
- **WHEN** `installCopilot()` runs and a prompt, command, instruction, skill, or agent file already exists at its destination
- **THEN** every such file is overwritten with the repo version and no per-file log line is emitted

### Requirement: uninstall subcommand routing
`bin/install.js` SHALL route the `uninstall` subcommand to a new `bin/uninstall-flow.js` module, alongside the existing `install` and `setup` routes. The router SHALL invoke the module's `main()` and, on a rejected promise, print the error and exit with a non-zero code, mirroring the existing `install` and `setup` routing. The installer's `--help` usage line and its unknown-subcommand error message SHALL both name `uninstall` as a valid subcommand (i.e. `[install|setup|uninstall]`).

#### Scenario: uninstall routes to the uninstall module
- **WHEN** a user runs `npx shared-ai uninstall`
- **THEN** `bin/install.js` invokes `bin/uninstall-flow.js`'s `main()` rather than the install or setup flow

#### Scenario: unknown subcommand still errors
- **WHEN** a user runs `npx shared-ai` with a subcommand that is not `install`, `setup`, or `uninstall`
- **THEN** the CLI prints an unknown-subcommand message listing the valid subcommands (including `uninstall`) and exits non-zero

#### Scenario: help text lists uninstall
- **WHEN** a user runs `npx shared-ai --help`
- **THEN** the printed usage line names `uninstall` alongside `install` and `setup`

### Requirement: uninstall argument validation
The `uninstall` subcommand SHALL recognize exactly two flags — `--dry-run` and `--yes` — and SHALL take no positional arguments (the uninstall target set is user-global and fixed, not path-parameterized). When invoked with an unexpected positional argument or an unrecognized flag, the flow SHALL print an explicit error naming the offending token and exit non-zero without deleting any file.

#### Scenario: positional argument is rejected
- **WHEN** a user runs `npx shared-ai uninstall /some/path`
- **THEN** the flow prints an error naming the unexpected argument, deletes nothing, and exits non-zero

#### Scenario: unrecognized flag is rejected
- **WHEN** a user runs `npx shared-ai uninstall --force`
- **THEN** the flow prints an error naming the unrecognized flag, deletes nothing, and exits non-zero

### Requirement: symmetric deletion-set enumeration
The uninstall deletion set SHALL be derived by symmetric enumeration from the same source→destination logic that produces the install copy list, computed against the same OS-aware base paths the installer uses. The deletion set SHALL NOT depend on any persisted install manifest. For every editor target the installer writes to, the deletion set SHALL contain exactly the destination file paths that the corresponding install function (`installClaude`, `installOpencode`, `installCopilot`) would write.

#### Scenario: deletion set mirrors install destinations
- **WHEN** the uninstall flow computes its deletion set for a given editor target
- **THEN** the set equals the exact destination paths the matching install function would produce for that target, using the same base-path resolution

#### Scenario: no manifest file is read or required
- **WHEN** the uninstall flow runs on a machine that never wrote an install manifest
- **THEN** it computes the deletion set from the install enumeration logic and does not read, require, or error on the absence of any manifest file

### Requirement: dry-run audit mode
When invoked with `--dry-run`, the uninstall flow SHALL print an operation plan and make no filesystem modifications, then exit with code 0. Each plan entry SHALL report the destination path, the action, whether the file exists on disk, and whether its on-disk content hash matches the canonical repo version.

#### Scenario: dry-run prints the plan and touches nothing
- **WHEN** a user runs `npx shared-ai uninstall --dry-run`
- **THEN** the flow prints one plan line per deletion-set path showing path, action, exists-on-disk, and hash-matches-canonical, deletes nothing, and exits 0

#### Scenario: dry-run does not prompt
- **WHEN** a user runs `npx shared-ai uninstall --dry-run`
- **THEN** no confirmation prompt is shown, because dry-run performs no destructive action

#### Scenario: plan carries version-skew upgrade guidance
- **WHEN** the plan is printed (in dry-run or before a destructive run)
- **THEN** it includes a note that the deletion set reflects the currently-resolved package version, and that a user who has upgraded since installing may run `npx shared-ai install` first to normalize on-disk files before uninstalling

### Requirement: confirmation gate by default
An interactive `uninstall` run without `--yes` and without `--dry-run` SHALL print the deletion plan and ask the user to confirm before deleting any file. If the user declines, no file SHALL be deleted and the flow SHALL exit without modifying the filesystem. The confirmation SHALL be presented through the harness's native option-picker where one exists, per the closed-choice-prompts rule.

#### Scenario: user confirms deletion
- **WHEN** a user runs `npx shared-ai uninstall`, the plan is printed, and the user confirms
- **THEN** the flow proceeds to delete the eligible files

#### Scenario: user declines deletion
- **WHEN** a user runs `npx shared-ai uninstall`, the plan is printed, and the user declines
- **THEN** no file is deleted and the flow exits without modifying the filesystem

### Requirement: yes flag skips confirmation
When invoked with `--yes` (and without `--dry-run`), the uninstall flow SHALL skip the confirmation prompt and proceed directly to deletion, for CI and scripted use. `--yes` SHALL NOT suppress the hash-guard warnings or the final summary.

#### Scenario: yes flag proceeds without prompting
- **WHEN** a user runs `npx shared-ai uninstall --yes`
- **THEN** the flow deletes the eligible files without asking for confirmation

#### Scenario: dry-run takes precedence over yes
- **WHEN** a user runs `npx shared-ai uninstall --dry-run --yes`
- **THEN** the flow prints the plan, deletes nothing, and exits 0

### Requirement: hash-guarded deletion of overrides
Before deleting a file in the deletion set, the flow SHALL compute the file's sha256 and compare it to the canonical version in the repo. When the file exists but its hash differs from the canonical version, the file SHALL be kept (not deleted) and a warning SHALL be printed identifying it as a project-local override. The comparison is a moment-in-time check against the current repo, not against an install-time snapshot.

#### Scenario: divergent file is kept
- **WHEN** a deletion-set file exists on disk but its content hash differs from the canonical repo version
- **THEN** the file is not deleted, a warning naming it as a local override is printed, and it is counted as kept-as-override

#### Scenario: matching file is deleted
- **WHEN** a deletion-set file exists on disk and its content hash matches the canonical repo version
- **THEN** the file is deleted

### Requirement: idempotency and summary reporting
Re-running uninstall SHALL be safe. A deletion-set path that does not exist on disk SHALL be silently skipped rather than raising an error. After deleting files, the flow SHALL remove now-empty parent directories, walking upward and stopping at (never removing) the editor base directory; a directory that still contains files (e.g. a kept override or unrelated user content) SHALL be left in place. At the end of the run the flow SHALL print a summary reporting the counts of files deleted, kept-as-override, and not-found.

#### Scenario: re-run after a completed uninstall
- **WHEN** a user runs `npx shared-ai uninstall` a second time after the first run deleted the files
- **THEN** the now-missing paths are silently skipped, no error is raised, and the summary reports them as not-found

#### Scenario: empty parent directories are removed
- **WHEN** deleting the files empties a parent directory the installer created
- **THEN** that directory is removed, the walk continues upward while directories are empty, and it stops at the editor base directory without removing the base

#### Scenario: non-empty directory with a kept override is preserved
- **WHEN** a directory still contains a file kept as a project-local override after deletion
- **THEN** that directory is left in place

#### Scenario: summary reports all three counts
- **WHEN** an uninstall run completes
- **THEN** it prints a summary with the number of files deleted, kept-as-override, and not-found

### Requirement: excluded targets are never touched
The uninstall flow SHALL NOT modify the opencode config files (`opencode.json`, `opencode.jsonc`), the per-project `setup` artifacts (`openspec/config.yaml`, `openspec/schemas/sai-workflow/`), or any externally-installed global CLI (`openspec`, `opencode-ai`, `@colbymchenry/codegraph`). No uninstall flag SHALL cause these to be modified.

#### Scenario: opencode config merges are left in place
- **WHEN** any `uninstall` invocation runs
- **THEN** `opencode.json` and `opencode.jsonc` are not read for modification and not deleted, leaving the merged agent keys intact

#### Scenario: per-project setup artifacts are not reversed
- **WHEN** any `uninstall` invocation runs
- **THEN** `openspec/config.yaml` and `openspec/schemas/sai-workflow/` are not deleted or modified

#### Scenario: external global CLIs are not uninstalled
- **WHEN** any `uninstall` invocation runs
- **THEN** the flow does not attempt to uninstall or remove `openspec`, `opencode-ai`, or `@colbymchenry/codegraph`

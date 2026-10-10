# audit-command-options Specification

## Purpose
TBD - created by archiving change sai-review-audit-options. Update Purpose after archive.

## Requirements

### Requirement: Each review and audit command declares its options in its own options.md

`/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` SHALL each declare the options they accept after the change name in `sai/commands/{review,security,performance,accessibility}/options.md`. Review SHALL declare exactly `--parent-branch`. Security SHALL declare `--full`, `--path`, and `--parent-branch`. Performance SHALL declare `--full`, `--path`, `--tier`, `--runtime`, and `--parent-branch`. Accessibility SHALL declare `--full`, `--path`, `--runtime`, and `--parent-branch`. Each command's `coordinator.md` and `steps/common.md` SHALL fetch its own `options.md`. The coordinator SHALL forward `arguments_value` unchanged and SHALL NOT parse it. Review SHALL declare no `--full` and no `--path`, because it reviews the diff only.

#### Scenario: Coordinator and worker load the same declaration
- **WHEN** `/sai-6-security` runs
- **THEN** its coordinator and its `steps/common.md` both fetch `sai/commands/security/options.md`, and the coordinator forwards `arguments_value` unparsed

### Requirement: Workers parse arguments per options.md and reject undeclared input

Each review and audit worker SHALL parse `arguments_value` per its `options.md`: an optional change name, then the declared options. The first token that does not start with `--` and is not an option's value SHALL be the change name. A leading `--` token SHALL mean no name was supplied, and the zero/one/multiple picker SHALL run. An unknown `--` option, an option missing its value, or a second positional value SHALL return `failed` before any resolution and name the token. The performance worker SHALL also reject a `--tier` value outside `backend|frontend|db|queue`.

#### Scenario: Unknown option is rejected
- **WHEN** `/sai-6-security my-change --tier db` is invoked
- **THEN** the worker returns `failed` naming `--tier` before resolving the change

### Requirement: The parent branch is passed only as --parent-branch

Review and audit commands SHALL accept the parent branch only as `--parent-branch <branch>`. The positional parent branch is retired. A second positional value SHALL be rejected with a message stating that the parent branch is passed as `--parent-branch <branch>`. Parent-branch detection SHALL use the `--parent-branch` value first, then the existing remote-default, `master`, and `main` fallbacks.

#### Scenario: Positional parent branch is rejected
- **WHEN** `/sai-5-review my-change develop` is invoked
- **THEN** the worker returns `failed` naming `develop` and stating that the parent branch is passed as `--parent-branch <branch>`

### Requirement: Review and audit commands run unattended unless --runtime is passed

A review or audit command SHALL ask no question between change resolution and its close unless the user passes `--runtime`. Without `--runtime`, `/sai-7-performance` SHALL resolve its diagnostics gate as skipped without asking, and `/sai-8-accessibility` SHALL perform static review only. With `--runtime`, each runtime command SHALL run only after the user authorizes it.

#### Scenario: Performance without --runtime asks nothing
- **WHEN** `/sai-7-performance my-change` runs and a finding could be firmed up by a diagnostic
- **THEN** the diagnostics gate resolves as skipped without a `needs_input`, and the finding keeps its estimated mark

### Requirement: Both harness wrappers announce the options

The Claude Code and opencode wrappers SHALL name the accepted options in their `description`:
- `/sai-review`: `--full`, `--path <dir>`, `--tier <tier>`, `--runtime`, `--parent-branch <branch>`.
- `/sai-5-review`: `--parent-branch <branch>`.
- `/sai-6-security`: `--full`, `--path <dir>`, `--parent-branch <branch>`.
- `/sai-7-performance`: `--full`, `--path <dir>`, `--tier <tier>`, `--runtime`, `--parent-branch <branch>`.
- `/sai-8-accessibility`: `--full`, `--path <dir>`, `--runtime`, `--parent-branch <branch>`.

Each Claude Code `argument-hint` SHALL write the parent branch as `--parent-branch <branch>`.

#### Scenario: Wrapper description lists --parent-branch
- **WHEN** a user lists commands in Claude Code or opencode
- **THEN** the `/sai-5-review` description mentions `--parent-branch <branch>`

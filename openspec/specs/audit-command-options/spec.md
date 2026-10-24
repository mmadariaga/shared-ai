# audit-command-options Specification

## Purpose
TBD - created by archiving change sai-review-audit-options. Update Purpose after archive.

## Requirements

### Requirement: Each review and audit command declares its options in its own options.md

`/sai-4-review`, `/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility` SHALL each declare the options they accept after the change name in `sai/commands/{review,security,performance,accessibility}/options.md`. Review SHALL declare exactly `--parent-branch`. Security SHALL declare `--full`, `--path`, and `--parent-branch`. Performance SHALL declare `--full`, `--path`, `--tier`, `--runtime`, and `--parent-branch`. Accessibility SHALL declare `--full`, `--path`, `--runtime`, `--url`, and `--parent-branch`. The shared audit coordinator `sai/commands/audit/coordinator.md` SHALL fetch the `options.md` of the audit it runs, and each audit's `steps/common.md` SHALL apply the same declaration to scope. Review SHALL declare no `--full` and no `--path`, because it reviews the diff only.

#### Scenario: Coordinator and worker load the same declaration
- **WHEN** `/sai-5-security` runs
- **THEN** the shared audit coordinator fetches `sai/commands/security/options.md` and the security worker's `steps/common.md` applies the same declaration to the scope it audits

### Requirement: Workers parse arguments per options.md and reject undeclared input

The coordinator of each audit command SHALL parse `arguments_value` per the audit's `options.md`: an optional change name, then the declared options. The first token that does not start with `--` and is not an option's value SHALL be the change name. An unknown `--` option, an option missing its value, a value outside the set `options.md` declares, or a second positional value SHALL end the run before change resolution, writing nothing and naming the token. The performance `--tier` value SHALL be one of `backend|frontend|db|queue`. The audit workers SHALL receive the options as given in the task brief and SHALL NOT parse `arguments_value` or resolve the change.

#### Scenario: Unknown option is rejected
- **WHEN** `/sai-5-security my-change --tier db` is invoked
- **THEN** the audit coordinator prints the unknown-or-malformed-argument line naming `--tier` and ends before resolving the change, with no worker created

### Requirement: The parent branch is passed only as --parent-branch

Review and audit commands SHALL accept the parent branch only as `--parent-branch <branch>`. The positional parent branch is retired. A second positional value SHALL be rejected with a message stating that the parent branch is passed as `--parent-branch <branch>`. Parent-branch detection SHALL use the `--parent-branch` value first, then the existing remote-default, `master`, and `main` fallbacks.

#### Scenario: Positional parent branch is rejected
- **WHEN** `/sai-4-review my-change develop` is invoked
- **THEN** the worker returns `failed` naming `develop` and stating that the parent branch is passed as `--parent-branch <branch>`

### Requirement: Review and audit commands run unattended unless --runtime is passed

A review or audit command SHALL ask no question between change resolution and its close, with or without `--runtime`, except an input it cannot do without and the escalation of an obstacle it cannot clear. `--runtime` SHALL be the whole authorization for performance diagnostics and accessibility scanners. Without `--runtime`, `/sai-6-performance` SHALL resolve its diagnostics gate as skipped without asking, and `/sai-7-accessibility` SHALL perform static review only. With `--runtime` and no `--url`, `/sai-7-accessibility` SHALL ask once for the dev-server URL as an input, before its worker starts.

#### Scenario: Performance without --runtime asks nothing
- **WHEN** `/sai-6-performance my-change` runs and a finding could be firmed up by a diagnostic
- **THEN** the diagnostics gate resolves as skipped without any question, and the finding keeps its estimated mark

#### Scenario: Performance with --runtime asks nothing
- **WHEN** `/sai-6-performance my-change --runtime` runs and a finding could be firmed up by a diagnostic
- **THEN** the diagnostic runs with no authorization question

### Requirement: Both harness wrappers announce the options

The Claude Code and opencode wrappers SHALL name the accepted options in their `description`:
- `/sai-deep-review`: `--full`, `--path <dir>`, `--tier <tier>`, `--runtime`, `--parent-branch <branch>`.
- `/sai-4-review`: `--parent-branch <branch>`.
- `/sai-5-security`: `--full`, `--path <dir>`, `--parent-branch <branch>`.
- `/sai-6-performance`: `--full`, `--path <dir>`, `--tier <tier>`, `--runtime`, `--parent-branch <branch>`.
- `/sai-7-accessibility`: `--full`, `--path <dir>`, `--runtime`, `--url <url>`, `--parent-branch <branch>`.

Each Claude Code `argument-hint` SHALL write the parent branch as `--parent-branch <branch>`, and the `/sai-7-accessibility` hint SHALL list `[optional: --url <url>]`.

#### Scenario: Wrapper description lists --parent-branch
- **WHEN** a user lists commands in Claude Code or opencode
- **THEN** the `/sai-4-review` description mentions `--parent-branch <branch>`

#### Scenario: Accessibility wrapper lists --url
- **WHEN** a user lists commands in Claude Code or opencode
- **THEN** the `/sai-7-accessibility` description mentions `--url <url>`

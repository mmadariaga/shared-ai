# unattended-audit-coordinator Specification

## Purpose
TBD - created by archiving change audits-run-unattended-goal-driven. Update Purpose after archive.

## Requirements

### Requirement: The three audit commands share one unattended coordinator

The Claude Code and opencode wrappers of `/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility` SHALL load the harness fetch skill and `sai/commands/audit/coordinator.md`, forwarding an invocation envelope whose `command_name` names the audit (`security`, `performance`, or `accessibility`) and whose `arguments_value` carries the raw arguments, with no boot adapter and no command bootstrap. The coordinator SHALL read `sai/commands/{audit}/options.md` for the options that audit accepts, and SHALL load only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, `obstacle-escalation`, and `finding-state`, never `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, `bounded-dispatch-retry`, or `composition.md`.

#### Scenario: A wrapper starts the shared coordinator
- **WHEN** a user invokes `/sai-6-performance my-change` on Claude Code or opencode
- **THEN** the wrapper fetches `sai/commands/audit/coordinator.md` with `command_name: performance` and the arguments as `arguments_value`
- **AND** the coordinator reads `sai/commands/performance/options.md` and loads none of the shared orchestration files

### Requirement: The audit coordinator validates arguments and resolves the change itself

The coordinator SHALL drop every `--fast-track` token silently, with no banner. It SHALL end the run writing nothing, printing `Cannot start {command}: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.`, when the arguments carry an unknown `--` token, a second positional value, an option without its value, or a value outside the set its `options.md` declares. With no change name it SHALL take the only change directory under `openspec/changes/` (archive excluded) that has a `proposal.md`, and with none or several it SHALL print `Cannot start {command}: name the change ({candidates, or none}).` and end without escalating. A named change without `proposal.md` SHALL end the run with `Cannot start {command} for {name}: missing proposal.md.`. The audit workers SHALL NOT resolve the change.

#### Scenario: Fast-track is ignored
- **WHEN** a user invokes `/sai-5-security my-change --fast-track`
- **THEN** the coordinator drops `--fast-track` with no banner and audits `my-change`

#### Scenario: Several candidate changes
- **WHEN** no change name is given and two change directories have a `proposal.md`
- **THEN** the coordinator prints `Cannot start /sai-5-security: name the change (...)` naming both and ends with no file written

#### Scenario: A second positional value is rejected
- **WHEN** a user invokes `/sai-7-accessibility my-change develop`
- **THEN** the coordinator prints the unknown-or-malformed-argument line for `develop` and writes nothing

### Requirement: The audit coordinator runs one worker cycle per audit

The coordinator SHALL run each audit as a cycle for one worker: spawn a `sai-state` session keyed `{audit}-{name}`, `reset` the `{audit}-steps@1` machine, create the audit's named worker with a ready-only dispatch, send the task in the next message opening with `Active step: <stage> — follow <pointer>` and naming the change, the options as given, and `openspec/changes/{name}/{audit}.md`, emit every `step-done` batch to the machine, and send the next pointer from the response. When the store fails, it SHALL send pointers from the static step order the worker card lists. The cycle SHALL hold no state outside its own session, so that another command can drive several cycles at once while issuing every `sai-state` call and every commit one at a time. The coordinator SHALL `close` the session before ending in any outcome.

#### Scenario: A skip batch advances the machine
- **WHEN** the worker returns `step-done` with several step ids because it skipped a stage
- **THEN** the coordinator emits all of them to `{audit}-steps@1` and sends the pointer of the next step that still has work

#### Scenario: The store fails
- **WHEN** a `sai-state` emit fails
- **THEN** the coordinator sends the next pointer from the static order and the run continues

### Requirement: Audit workers share one worker-common contract

`sai-5-security-worker`, `sai-6-performance-worker`, and `sai-7-accessibility-worker` SHALL load `sai/commands/audit/worker-common.md`, which defines the `event: ready` handshake, the closed results `step-done`, `question`, `completed` (with `report_path` and `counts`), and `failed`, and the boundaries: write only `openspec/changes/{change-name}/{audit}.md`, fix no finding, run no repository-changing git command and no `openspec` command, and dispatch only `budget-explorer`. Each worker card SHALL keep only its audit's plan of step ids and batching rules. The security `counts` SHALL carry no `informational` key, and a Not Applicable report SHALL carry all-zero counts. The worker bindings SHALL render from the standalone worker template with only the create and continue calls.

#### Scenario: A worker writes outside its report
- **WHEN** an audit worker would need to edit production code to fix a finding
- **THEN** it records the finding in the report and changes no other file

### Requirement: Worker questions become assumptions unless they change the report

The coordinator SHALL answer a worker `question` when the change, its artifacts, or the repository answer it, and SHALL record that answer as an assumption in the closing report. A question whose answer would not change the report SHALL be answered with the coordinator's best reading and recorded as an assumption. Only a question that nothing answers and whose answer would change the report SHALL be escalated to the user through the native picker.

#### Scenario: The repository answers a question
- **WHEN** the worker asks which parent branch to diff against and the repository configuration answers it
- **THEN** the coordinator answers the worker and lists the answer as an assumption in the closing report, asking the user nothing

### Requirement: Each audit verifies and commits only its report

On a `completed` result the coordinator SHALL verify the report before committing it: the report exists and is non-empty, `node <lint> audit-report {report} --audit {audit}` exits 0, `node <check-cited-paths> audit-report {name} --audit {audit}` exits 0, and the worker's `counts` agree with the report's `Summary:` tally. It SHALL then check the report with `git check-ignore -q`; when it is not ignored, it SHALL stage that path alone and commit it with a Conventional Commits subject of at most 50 characters as `git commit -m "<subject>" -- <path>`, never force-adding, never pushing, and committing no other file. An ignored report SHALL stay on disk uncommitted and the closing report SHALL say so. A `failed` result SHALL print the worker's summary and commit nothing. The closing report SHALL end with exactly `{Audit} audit done.`.

#### Scenario: A verified report is committed
- **WHEN** the security worker completes and both checks exit 0
- **THEN** the coordinator commits only `openspec/changes/{name}/security.md` locally, pushes nothing, and ends with `Security audit done.`

#### Scenario: An ignored report
- **WHEN** `git check-ignore -q` reports the report path as ignored
- **THEN** no commit is created and the closing report states the report was left uncommitted because the project ignores it

#### Scenario: Previously staged files stay out
- **WHEN** another path is already staged before the audit commits
- **THEN** the commit contains only the report path

### Requirement: Audit obstacles have a bounded attempt budget

The coordinator SHALL treat an invalid or unreadable report, a worker that returns no ready, a silent worker, and a drifting worker as obstacles, each with a budget of 3 attempts, where an attempt is a response with an approach different from the previous one: a corrected instruction to the same worker naming the defect, a replacement worker that receives a hand-over note and no prior history and audits from the first step, or a mechanical repair that never adds, removes, or rewrites a finding. An exhausted budget SHALL escalate through the native picker with options that each name a different way forward and one that stops the run; a stop or a dismissed question SHALL end the run with nothing committed.

#### Scenario: A tally mismatch is repaired
- **WHEN** the `audit-report` check fails only because the `Summary:` tally miscounts the findings
- **THEN** the coordinator may repair the tally mechanically, re-verify, and commit, without changing any finding

#### Scenario: The budget is exhausted
- **WHEN** three different approaches fail to produce a valid report
- **THEN** the coordinator states what happened and what it tried, commits nothing, and asks the user through the picker how to continue or stop

### Requirement: An audit run regenerates its report from scratch

A new audit run SHALL regenerate the report completely and SHALL NOT resume an interrupted run or read an earlier report; earlier findings, their ` (FIXED)` marks, and user deletions are replaced. The audit command SHALL fix no finding.

#### Scenario: A rerun after interruption
- **WHEN** an audit run was interrupted and the user runs the command again
- **THEN** the new worker audits from the first step and writes a fresh report

### Requirement: Audit step machines deliver the step files by pointer

`sai-state` SHALL register `security-steps@1`, `performance-steps@1`, and `accessibility-steps@1`, each built with `sai-state/machines/linear-steps.js`, whose first step is the audit's fileless scope step and whose remaining steps point at the files under `sai/commands/{audit}/steps/`. The former `security-standalone@1`, `performance-standalone@1`, and `accessibility-standalone@1` machines SHALL NOT be registered, and `/sai-deep-review` SHALL drive the same `{audit}-steps@1` machines in its audit cycles.

#### Scenario: Reset names the first filed step
- **WHEN** the coordinator resets `security-steps@1`
- **THEN** the response points at `sai/commands/security/steps/discover-module-map.md` and the worker runs `resolve-security-scope` inline before it

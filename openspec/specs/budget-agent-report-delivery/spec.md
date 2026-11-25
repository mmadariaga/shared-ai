# budget-agent-report-delivery Specification

## Purpose

TBD - created by archiving change budget-agents-deliver-file-references. Update Purpose after archive.

## Requirements

### Requirement: Budget agents deliver every result as a saved report reference

`sai/policies/worker-report-transport.md` SHALL hold a `## Budget agents` section that is the single source of how `budget-explorer`, `budget-subagent`, and `budget-executor` deliver their results, whoever dispatches them: an SAI coordinator, a worker that dispatches its own helpers, a main session in budget mode, or a plain session. There SHALL be no inline-text mode. A task SHALL open with the line `--report-dir <absolute path>`, optionally followed by `--harness <claude|opencode>`; the agent SHALL strip both, keep them for every later message, and pass the harness value as `--harness` to `transfer.js`. The agent SHALL write its complete result, shaped by the task's output contract, to a draft in the report directory and save it with `transfer.js put --dir <report-dir> --path <unique-name>.md --exclusive --input-file <draft>`, under a new name for every response. It SHALL run the arm check of `sai/policies/cache-warming.md` before its final message, and that message SHALL hold only the `{path, sha256}` that `put` printed and the `warming: true|false` line: no text before the reference, no excerpt or summary, and no wording that points at earlier text. `sai/policies/explore-agent.md`, `sai/policies/executor-agent.md`, and `sai/policies/budget-agent.md` SHALL point to the agent side of that section and SHALL NOT describe a text reply.

#### Scenario: the final message holds only the reference

- **WHEN** a budget agent finishes a task that opened with `--report-dir <dir>`
- **THEN** its report is saved in `<dir>` with `transfer.js put --exclusive` and its final message holds only the `{path, sha256}` reference and the `warming:` line

#### Scenario: a task without the report directory gets no work

- **WHEN** a budget agent receives a task without the `--report-dir` line
- **THEN** it does no work and replies with one line that names the missing line

#### Scenario: a twice-failed save names the draft

- **WHEN** `transfer.js put` fails twice for a budget agent's report
- **THEN** the agent replies with one line that names the failure and the path of the draft already written in the report directory, and the result stays out of the message

#### Scenario: a warmed budget agent repeats its last reference

- **WHEN** a budget agent that received the warming switch wakes with no real message since its last result
- **THEN** it repeats its last reference and `warming:` line, as `sai/policies/cache-warming.md` § Repeat the last result says for a worker

### Requirement: Dispatchers open, accept, recover, and close the helper report directory

The `## Budget agents` section SHALL define the dispatcher side. The dispatcher SHALL create one helper report directory with `transfer.js open --harness <claude|opencode>` before its first budget dispatch, SHALL send its `dir` as the first line `--report-dir <dir>` of every task message to a budget agent, continuations included, and the agent SHALL never run `open`. A Claude Code dispatcher whose agent is routed to opencode (`harness: opencode`) SHALL add `--harness claude` as the second line, for all three agents. Parallel helpers SHALL share the directory, each saving under its own name. The dispatcher SHALL run `transfer.js accept` on a reference before it reads the report; `already: true` SHALL be treated as a wake acknowledgement. A message that carries no reference, text after the reference other than the `warming:` line, or a reference that `accept` refuses SHALL be an undelivered report, recovered at once through the scan of `## Undelivered reports` on the helper directory before the agent is asked once again for the report of the work already done; a second failure SHALL be a failed helper dispatch. While waiting, the dispatcher SHALL run one watch per helper directory with an `--input-file` holding `[]`. It SHALL close the directory with `transfer.js close` once no live helper uses it and nobody else will read its files; a directory whose reports pass to a later phase, the `/sai-plan` research directory, SHALL be closed by the agent that created it at the end of its run. A worker that dispatches helpers SHALL use the helper directory its coordinator gives it or create and close its own, and a main session in budget mode SHALL create the directory at its first budget dispatch and close it when it disposes the agent.

#### Scenario: a lost message is recovered from the ledger scan

- **WHEN** a budget agent saved its report but its message carried no reference
- **THEN** the dispatcher's scan finds the report absent from the `.sai-accepted` ledger, the dispatcher accepts it with `transfer.js accept`, and it asks the agent again only when the scan finds none

#### Scenario: a repeated reference is a wake acknowledgement

- **WHEN** a budget agent repeats a reference the dispatcher already accepted
- **THEN** `transfer.js accept --check` answers `already: true` and the dispatcher reads nothing again and spends no attempt

#### Scenario: an opencode-routed agent saves under the Claude Code temp root

- **WHEN** a Claude Code dispatcher sends a task to a budget agent whose agent file carries `harness: opencode`
- **THEN** the task carries `--harness claude` as its second line, right after `--report-dir`

#### Scenario: parallel helpers share one directory

- **WHEN** a dispatcher runs several budget agents at once
- **THEN** they share its helper report directory and each saves with `put --exclusive` under its own name, so no report overwrites another

### Requirement: Budget reports carry no schema and no validator

A budget report SHALL follow the output contract of its task and SHALL have no closed schema, no `--command` row in `worker-report-validator.js`, and no `outcome`; the dispatcher's `transfer.js accept` SHALL be its only check. `transfer.js` SHALL gain no sub-command for budget delivery. A worker's own report directory SHALL never be its dispatcher's helper directory, and the liveness guard and retired-handle record of `sai/policies/worker-lifecycle.md` SHALL stay with workers.

#### Scenario: the validator has no budget command

- **WHEN** the role-field table of `worker-report-validator.js` is read
- **THEN** it has no row for a budget agent and the dispatcher checks a budget reference with `transfer.js accept` only

### Requirement: The budget-executor writes only inside the SAI temp root

The `executor` capability profile (`budget-executor`) in `sai/install-manifest.json` SHALL grant `write: "temp"`, so its one write of its own is its report file in the SAI temp root; the `research` profile (`budget-explorer`) SHALL keep `write: "temp"` and its `transfer.js put` shell grant, and the `task` profile (`budget-subagent`) SHALL stay unchanged. Every command profile whose card dispatches budget agents SHALL allow `transfer.js open`, `accept`, `watch`, and `close`.

#### Scenario: the executor profile resolves to temp-only writes

- **WHEN** the `executor` profile is resolved
- **THEN** its `write` grant is `"temp"` and it gains no repository write

### Requirement: Budget skills carry the report-delivery rule on both harnesses

The Claude Code and opencode `budget-explorer`, `budget-subagent`, and `budget-executor` skills SHALL state that every spawn prompt opens with the line `--report-dir <dir>`, the helper report directory the dispatcher opened with `transfer.js open`, that the agent replies with its `{path, sha256}` reference only, and that there is no text reply. They SHALL point to `sai/policies/worker-report-transport.md` § Budget agents, dispatcher side, for creating, accepting, recovering, and closing. Only the Claude Code skills SHALL name the `--harness claude` line for an agent routed to opencode; the opencode skills SHALL place the line at the top of the `subagent` prompt.

#### Scenario: each skill names the report directory line

- **WHEN** any of the six budget skills is read
- **THEN** it says that every spawn prompt opens with `--report-dir <dir>` and that there is no text reply

# opencode-agent-dispatch Specification

## Purpose
TBD - created by archiving change opencode-worker-dispatch. Update Purpose after archive.

## Requirements

### Requirement: Route by the hand-set harness key

`sai/tools/opencode-dispatch.js route --agent <name> [--cwd <project-root>]` SHALL print one JSON object `{route, cause, agent, notice?}` and exit 0. It SHALL read the `harness:` key from the frontmatter of the agent file Claude Code resolves, `<project-root>/.claude/agents/<name>.md` first and then the `agents/` directory of the Claude Code global root. It SHALL answer `route: opencode` only when that key's value is `opencode`, the `opencode` binary runs, and opencode lists an agent of the same name. Every other case SHALL answer `route: claude`.

#### Scenario: Agent file without the key or with harness claude
- **WHEN** the resolved agent file carries no `harness:` key, or carries `harness: claude`
- **THEN** the route is `claude` with no notice

#### Scenario: Harness opencode with binary and same-named agent
- **WHEN** the agent file carries `harness: opencode`, the `opencode` binary runs, and `opencode debug agents` lists an agent of the same name
- **THEN** the route is `opencode`

#### Scenario: Project agent file wins
- **WHEN** both the project `.claude/agents/<name>.md` and the global agent file exist with different `harness:` values
- **THEN** the route follows the project file

#### Scenario: Missing binary or agent falls back with a notice
- **WHEN** the agent file carries `harness: opencode` and the `opencode` binary is missing, opencode lists no agent of that name, or opencode does not list its agents
- **THEN** the route is `claude` with a `notice` that names the agent and the cause

### Requirement: One opencode run turn per message

`opencode-dispatch.js start --agent <name> --input-file <path>` and `continue --session <sessionID> --input-file <path> [--agent <name>]` SHALL each run exactly one `opencode run --format json` process, never through a shell, never with `--auto`, and without input to wait on. The message SHALL reach opencode exactly as the input file holds it, as the single argument after `--`. Each command SHALL print one JSON object `{status, sessionID, text, tokens, cost, exit_code, error}`, where `sessionID` is the one of the first output event, `text` is the text of the turn's last message, and `tokens` and `cost` sum the turn's steps. A turn SHALL be `failed` on a non-zero exit, an `error` event, or, for `start`, no `sessionID`. The tool SHALL exit 0 for `ok`, 1 for `failed`, and 2 for a usage error, and stopping the tool SHALL stop its `opencode run` process.

#### Scenario: Message starting with double dash passes intact
- **WHEN** the input file holds a message whose first line starts with `--`
- **THEN** opencode receives that text unchanged as the one argument after `--` and the arguments never contain `--auto`

#### Scenario: Failed turn
- **WHEN** `opencode run` exits non-zero, prints an `error` event, or a `start` turn prints no `sessionID`
- **THEN** the tool prints `status: failed` with the error and exits 1

#### Scenario: Continuation keeps its session
- **WHEN** a `continue` turn's output names no `sessionID`
- **THEN** the printed `sessionID` is the one passed with `--session`

#### Scenario: Usage error
- **WHEN** the command is unknown, a required option or `--input-file` is missing, or an option is repeated or misplaced
- **THEN** the tool prints the usage and exits 2

### Requirement: Dispatch policy is the single source

`sai/policies/opencode-dispatch.md` SHALL be the single source for how a Claude Code coordinator, or a Claude Code worker that dispatches helpers, creates, continues, and disposes an opencode-routed agent. The Claude Code routed-worker binding template, the three Claude Code budget skills, and the design overview step SHALL point to it instead of restating it. With opencode as the main harness, dispatch SHALL stay as each card and skill write it, and opencode dispatch sites and templates SHALL NOT carry the routing key.

#### Scenario: Dispatch sites point to the policy
- **WHEN** the Claude Code standalone worker binding template, the Claude Code `budget-explorer`, `budget-executor`, and `budget-subagent` skills, and `sai/commands/design/steps/overview.md` are read
- **THEN** each points to `sai/policies/opencode-dispatch.md` for an agent whose file carries `harness: opencode`

#### Scenario: opencode as main harness is unchanged
- **WHEN** the opencode dispatch sites and templates are read
- **THEN** none of them carries the `harness:` routing key or the opencode dispatch policy

### Requirement: Create and continue an opencode-routed agent

Before creating any agent, including a replacement, the dispatcher SHALL run the route query. When it answers `opencode`, the dispatcher SHALL write the same ready prompt the `Agent` call would send to a file in a per-run message directory opened with `transfer.js open --harness claude`, run `start` in the background through `Bash` with `run_in_background: true`, and keep the `Bash` task id; the `sessionID` of a successful ready turn SHALL be the worker's handle. Each later message SHALL be a new background `continue` turn on that `sessionID` instead of `SendMessage`, started only after the earlier turn of the same worker has completed, and its `text` SHALL be read exactly like an `Agent` reply. Parallel workers SHALL each run their own process and be matched to their results by `sessionID`.

#### Scenario: Worker continued through a new turn
- **WHEN** a coordinator sends a later message to an opencode-routed worker
- **THEN** it writes the message to a new file and runs a background `continue --session <sessionID>` turn instead of `SendMessage`

#### Scenario: Parallel workers
- **WHEN** several opencode-routed workers are created in one batch
- **THEN** each runs its own `opencode run` process and each result carries its own `sessionID`

### Requirement: Fallback to Agent dispatch with a notice

When the route answers `claude` with a `notice`, the dispatcher SHALL print the notice once as one visible message and dispatch through the `Agent` tool with the Claude Code file's `model`. When the ready turn through opencode fails, the dispatcher SHALL print one notice naming the agent and the error and create the worker through the `Agent` tool instead. A turn that fails after ready SHALL be an ordinary obstacle of the coordinator's step, and its replacement SHALL be routed again.

#### Scenario: Ready turn fails
- **WHEN** the `start` turn of an opencode-routed worker returns `status: failed`
- **THEN** the dispatcher prints one notice naming the agent and the error and creates the worker through the `Agent` tool

#### Scenario: Failure after ready
- **WHEN** a `continue` turn of an opencode-routed worker fails after its ready turn succeeded
- **THEN** the failure is handled as an obstacle of the coordinator's step and the replacement worker is routed again

### Requirement: Opencode-routed agents are not warmed

An opencode-routed agent SHALL receive no cache-warming switch: the dispatcher's messages to it SHALL end without the `Warming:` line, and its messages SHALL declare `warming: false`.

#### Scenario: Task message without warming switch
- **WHEN** a coordinator sends a task message to an opencode-routed worker
- **THEN** the message carries no `Warming:` line and the worker's reply declares `warming: false`

### Requirement: Reports and questions of an opencode-routed worker

A task message to an opencode-routed worker that carries `--report-dir` SHALL carry `--harness claude` as its second line, right after it, so the worker resolves the Claude Code SAI temp root that holds the coordinator's report directory. A message without `--report-dir` SHALL carry no such line, and the dispatch tool SHALL add nothing to any message. A worker question SHALL reach the coordinator only as a `needs_input` report: no turn opens an interactive opencode prompt, and a permission that asks is rejected without blocking the turn. The agent SHALL work with the permissions and tools of its OpenCode agent file.

#### Scenario: Harness line follows the report directory
- **WHEN** a coordinator discloses a task with `--report-dir` to an opencode-routed worker
- **THEN** the second line of the message is `--harness claude`

#### Scenario: Ready prompt carries no harness line
- **WHEN** a coordinator sends the ready prompt to an opencode-routed worker
- **THEN** the message carries no `--harness` line

#### Scenario: Ask permission does not block
- **WHEN** an opencode-routed agent's OpenCode permission for a tool is `ask`
- **THEN** the turn rejects that call without prompting and continues or fails without blocking

### Requirement: Dispose an opencode-routed agent

On Claude Code, an opencode-routed agent SHALL be disposed at the points of `sai/policies/worker-lifecycle.md` with `TaskStop` on the `Bash` task of its running turn, in the same same-turn batch as the other stops of the point. With no turn running there SHALL be nothing to stop, and the worker SHALL count as disposed. No `dispose` message and no `dispose-shells.js` call SHALL apply.

#### Scenario: Dispose with no turn running
- **WHEN** a coordinator disposes an opencode-routed worker whose last turn has completed
- **THEN** the worker counts as disposed and no `dispose` message is sent

#### Scenario: Dispose with a running turn
- **WHEN** a coordinator disposes an opencode-routed worker whose turn still runs
- **THEN** it issues `TaskStop` on that turn's `Bash` task in the batch of the dispose point

### Requirement: Coordinator profile allows the dispatch tool

The `coordinator` capability profile of `sai/install-manifest.json` SHALL allow the shell rule `node {sai}/tools/opencode-dispatch.js *`.

#### Scenario: Coordinator profile shell rules
- **WHEN** the `coordinator` profile's shell rules are read
- **THEN** they include `node {sai}/tools/opencode-dispatch.js *`

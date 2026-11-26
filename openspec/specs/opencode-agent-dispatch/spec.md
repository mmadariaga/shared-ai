# opencode-agent-dispatch Specification

## Purpose
TBD - created by archiving change opencode-worker-dispatch. Update Purpose after archive.

## Requirements

### Requirement: Route by the hand-set harness key

`sai/tools/opencode-dispatch.js route --agent <name> [--cwd <project-root>]` SHALL print one JSON object `{route, cause, agent, notice?}` and exit 0. It SHALL read the `harness:` key from the frontmatter of the agent file Claude Code resolves, `<project-root>/.claude/agents/<name>.md` first and then the `agents/` directory of the Claude Code global root. It SHALL answer `route: opencode` only when that key's value is `opencode`, the opencode command that `sai/tools/opencode-launcher.js` resolves runs, and opencode lists an agent of the same name. Every other case SHALL answer `route: claude`. When the launcher resolves an `opencode` shim that names no executable that exists, the cause SHALL be `opencode-shim-unresolved` and the `notice` SHALL name the shim path, so a broken resolution is never reported as a missing install. The setup passthrough warning SHALL use the same probe, so setup and the route query report the same cause for the same machine.

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

#### Scenario: Unresolved shim falls back with its own cause
- **WHEN** the agent file carries `harness: opencode` and the launcher finds an `opencode` shim whose `.exe` it cannot read or that does not exist, such as a pnpm, yarn, or scoop shim or a `.ps1`-only install
- **THEN** the route query and the setup passthrough warning both report the cause `opencode-shim-unresolved`, the route is `claude`, and the `notice` names the shim path

### Requirement: One opencode run turn per message

`opencode-dispatch.js start --agent <name> --input-file <path>` and `continue --session <sessionID> --input-file <path> [--agent <name>]` SHALL each run exactly one `opencode run --format json` process, launched as the command `sai/tools/opencode-launcher.js` resolves, never through a shell, never with `--auto`, and without input to wait on. The message SHALL reach opencode exactly as the input file holds it, as the single argument after `--`. Each command SHALL print one JSON object `{status, sessionID, text, tokens, cost, exit_code, error}`, where `sessionID` is the one of the first output event, `text` is the text of the turn's last message, and `tokens` and `cost` sum the turn's steps. A turn SHALL be `failed` on a non-zero exit, an `error` event, a launcher that resolves no command, or, for `start`, no `sessionID`. A `continue` refused by the turn lock SHALL be `busy` and run no process. The tool SHALL exit 0 for `ok`, 1 for `failed`, 2 for a usage error, and 3 for `busy`, and stopping the tool SHALL stop its `opencode run` process.

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

`sai/policies/opencode-dispatch.md` SHALL be the single source for how a Claude Code coordinator, or a Claude Code worker that dispatches helpers, creates, continues, and disposes an opencode-routed agent. The Claude Code routed-worker binding template, the three Claude Code budget skills, the design overview step, and the Claude Code creation step of explore's explorer two-phase startup SHALL point to it instead of restating it, and each SHALL state the route query of that policy as an unconditional step before every creation of the agent, a replacement included, without reading the agent file to decide whether the route applies: the `Agent` call creates the agent when the query answers `claude`, and the policy creates, continues, and disposes it when the query answers `opencode`. With opencode as the main harness, dispatch SHALL stay as each card and skill write it, and opencode dispatch sites and templates SHALL NOT carry the routing key.

#### Scenario: Dispatch sites point to the policy
- **WHEN** the Claude Code standalone worker binding template, the Claude Code `budget-explorer`, `budget-executor`, and `budget-subagent` skills, `sai/commands/design/steps/overview.md`, and the Claude Code creation step of § Explorer two-phase startup in `sai/commands/explore/body.md` are read
- **THEN** each points to `sai/policies/opencode-dispatch.md` and states its route query as an unconditional step before the agent is created, never conditional on the agent file

#### Scenario: opencode as main harness is unchanged
- **WHEN** the opencode dispatch sites and templates are read
- **THEN** none of them carries the `harness:` routing key or the opencode dispatch policy

### Requirement: Create and continue an opencode-routed agent

Before creating any agent, including a replacement, the dispatcher SHALL run the route query. When it answers `opencode`, the dispatcher SHALL write the same ready prompt the `Agent` call would send to a file in a per-run message directory opened with `transfer.js open --harness claude`, run `start` in the background through `Bash` with `run_in_background: true`, and keep the `Bash` task id; the `sessionID` of a successful ready turn SHALL be the worker's handle. Each later message SHALL be a new background `continue` turn on that `sessionID` instead of `SendMessage`, started only after the earlier turn of the same worker has completed, and its `text` SHALL be read exactly like an `Agent` reply. Parallel workers SHALL each run their own process and be matched to their results by the kept `Bash` task id, because the `sessionID` is what the result supplies.

#### Scenario: Worker continued through a new turn
- **WHEN** a coordinator sends a later message to an opencode-routed worker
- **THEN** it writes the message to a new file and runs a background `continue --session <sessionID>` turn instead of `SendMessage`

#### Scenario: Parallel workers
- **WHEN** several opencode-routed workers are created in one batch
- **THEN** each runs its own `opencode run` process, each result carries its own `sessionID`, and the dispatcher matches each result to its worker by the kept `Bash` task id

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

On Claude Code, an opencode-routed agent SHALL be disposed at the points of `sai/policies/worker-lifecycle.md` with `TaskStop` on the `Bash` task of its running turn, in the same same-turn batch as the other stops of the point. With no turn running there SHALL be nothing to stop, and the worker SHALL count as disposed. No `dispose` message and no `dispose-shells.js` call SHALL apply. `opencode-dispatch.js` SHALL keep its `SIGTERM`, `SIGINT`, and `SIGHUP` handlers, which stop its `opencode run` child on Linux and macOS, and its header comment SHALL record that on Windows those handlers do not run and that `TaskStop` on the `Bash` task ends the whole process tree there, as verified on Windows.

#### Scenario: Dispose with no turn running
- **WHEN** a coordinator disposes an opencode-routed worker whose last turn has completed
- **THEN** the worker counts as disposed and no `dispose` message is sent

#### Scenario: Dispose with a running turn
- **WHEN** a coordinator disposes an opencode-routed worker whose turn still runs
- **THEN** it issues `TaskStop` on that turn's `Bash` task in the batch of the dispose point

#### Scenario: Dispose on Windows ends the opencode child
- **WHEN** on Windows a coordinator issues `TaskStop` on the `Bash` task of a running turn
- **THEN** the whole process tree ends, the `opencode run` child included, although the signal handlers of `opencode-dispatch.js` do not run

### Requirement: Coordinator profile allows the dispatch tool

The `coordinator` capability profile of `sai/install-manifest.json` SHALL allow the shell rule `node {sai}/tools/opencode-dispatch.js *`.

#### Scenario: Coordinator profile shell rules
- **WHEN** the `coordinator` profile's shell rules are read
- **THEN** they include `node {sai}/tools/opencode-dispatch.js *`

### Requirement: One opencode launcher for every opencode spawn

`sai/tools/opencode-launcher.js` SHALL decide which opencode executable runs, and every SAI tool under `sai/tools/` and `bin/` that starts opencode SHALL spawn the command it returns, without a shell: the route probe and the `start` and `continue` turns of `sai/tools/opencode-dispatch.js`, the setup passthrough warning that shares that probe, the `opencode api` calls of `sai/tools/dispose-shells.js`, and the `opencode --version` check of `bin/doctor.js`, which on Windows SHALL report a shim it cannot resolve as `opencode-shim-unresolved`, naming the shim path, and spawn nothing. Its resolution SHALL take the platform, the environment, and the file-system reads as injectable inputs. On Linux and macOS the command SHALL be `opencode`, found on `PATH` by the spawn itself. On Windows the launcher SHALL walk the `PATH` directories in order without spawning a process, and in the first directory that holds an `opencode` entry SHALL take `opencode.exe` when present, otherwise the first quoted `.exe` path that `opencode.cmd` names, with a leading `%dp0%` or `%~dp0` replaced by the shim's directory and `node.exe` skipped, accepted only when that `.exe` exists. It SHALL skip an extensionless entry. A `.cmd` shim whose `.exe` cannot be read or does not exist, and an `opencode.ps1` entry without a `.exe` or `.cmd`, SHALL resolve to no command with the cause `opencode-shim-unresolved` and the shim path; no entry on `PATH` SHALL resolve to no command with the cause `opencode-missing`. A tool that receives no command SHALL start no process: `dispose-shells.js` SHALL treat the call as unanswered, and a `start` or `continue` turn SHALL fail with the cause and the shim path.

#### Scenario: Linux and macOS keep the PATH command
- **WHEN** the launcher resolves opencode on a platform other than `win32`
- **THEN** the command is `opencode` with no shim and no cause

#### Scenario: Windows executable on PATH runs directly
- **WHEN** on Windows the first `PATH` directory with an `opencode` entry holds `opencode.exe`
- **THEN** the launcher returns that `.exe` as the command, and `PATH` order decides which install runs

#### Scenario: npm cmd shim resolves to the executable it names
- **WHEN** on Windows the first `PATH` directory with an `opencode` entry holds an npm `opencode.cmd` whose quoted `.exe` path starts with `%dp0%` or `%~dp0`, beside an extensionless sh shim, in a directory whose path may contain spaces
- **THEN** the launcher returns the `.exe` under the shim's own directory, skips the extensionless shim, and the worker message reaches opencode as one argument, byte for byte, including line breaks, `%`, `^`, and quotes

#### Scenario: No opencode entry on PATH
- **WHEN** on Windows no `PATH` directory holds an `opencode` entry, whatever the case of the `PATH` key
- **THEN** the launcher returns no command with the cause `opencode-missing`

#### Scenario: Doctor uses the launcher on Windows
- **WHEN** `bin/doctor.js` checks the opencode version on Windows
- **THEN** it spawns the `.exe` the launcher resolves without a shell, and a shim the launcher cannot resolve is reported as `opencode-shim-unresolved` with the shim path and nothing is spawned

#### Scenario: Turns and stops use the same launcher
- **WHEN** the route query answers `opencode`
- **THEN** the `start` and `continue` turns and the `dispose-shells.js` calls launch the command the same launcher resolves

#### Scenario: Guard against a direct opencode spawn
- **WHEN** a file under `sai/tools/` or `bin/` other than the launcher calls `spawn`, `spawnSync`, `execFile`, or `execFileSync` with the literal `'opencode'` as its first argument
- **THEN** the guard test fails

### Requirement: Continue holds a per-session turn lock

`opencode-dispatch.js continue` SHALL hold a turn lock for its `sessionID` while its turn runs: the file `<Claude Code SAI temp root>/opencode-turns/<sessionID>.lock`, which holds the PID of the tool process and is removed when the turn ends, a signal that stops the tool included. A `continue` whose lock belongs to a live process SHALL send nothing to opencode, SHALL print `status: busy` with `busy_pid`, and SHALL exit 3. A lock whose process no longer exists SHALL be ignored and replaced by exactly one contender: the contender that holds an exclusive replacement claim SHALL remove the lock only while it still holds the stale PID it read, so two contenders over one stale lock never both acquire it. A `start` SHALL take no lock, and a temp root that cannot be resolved SHALL leave the turn unguarded. The coordinator SHALL treat `busy` as neither a failed turn nor an obstacle attempt: it SHALL wait for the completion notification of the earlier turn and resend the same message once from the same file, and a second `busy` after that notification SHALL be a failed turn of the step. The lock SHALL guard only the Claude Code dispatch of an opencode-routed agent; with opencode as the main harness, the existing rejected-continuation recovery stays in force.

#### Scenario: Continue to a running turn is refused
- **WHEN** `continue` runs for a session whose turn lock belongs to a live process
- **THEN** it sends nothing to opencode, prints `status: busy` with the PID of the running turn, and exits 3

#### Scenario: Stale lock is replaced
- **WHEN** `continue` runs for a session whose lock holds the PID of a process that no longer exists
- **THEN** the turn proceeds and the lock holds the new process's PID

#### Scenario: Two contenders over one stale lock
- **WHEN** two `continue` processes find the same stale lock at once
- **THEN** exactly one acquires the lock and the other is refused as busy

#### Scenario: Busy is resent once after the notification
- **WHEN** a coordinator's `continue` answers `busy`
- **THEN** it waits for the completion notification of the earlier turn and resends the same message once, without counting an obstacle attempt

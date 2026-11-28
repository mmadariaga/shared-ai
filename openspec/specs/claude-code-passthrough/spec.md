# claude-code-passthrough Specification

## Purpose

TBD - created by archiving change claude-code-passthrough. Update Purpose after archive.

## Requirements

### Requirement: Route key selects the Claude Code dispatch

`sai/tools/claude-dispatch.js route --agent <name> [--cwd <project-root>]` SHALL print one JSON object `{route, cause, agent, notice?}` and exit 0. It SHALL read the `harness:` key from the frontmatter of the opencode agent file opencode resolves, `<project-root>/.opencode/agents/<name>.md` first and then the `agents/` directory of the opencode global root. It SHALL answer `route: claude` only when that key's value is exactly `claude`, the `claude` command that `sai/tools/opencode-launcher.js` resolves runs, `claude auth status` reports a signed-in session or the environment authenticates the CLI through an API key, Bedrock, or Vertex, and a Claude Code agent file of the same name exists (project `.claude/agents/` first, then the Claude Code global root). Every other case SHALL answer `route: opencode` with its cause, and a missing or unauthenticated piece SHALL add a `notice` that names the agent and the cause, so a broken install is never reported as a usable route.

#### Scenario: Agent file without the key or with another value

- **WHEN** the opencode agent file carries no `harness:` key, or carries a value other than `claude`
- **THEN** the route is `opencode` with the cause `no-harness-key` or `harness-not-claude` and no notice

#### Scenario: Missing claude command falls back with a notice

- **WHEN** the agent file carries `harness: claude` and the launcher resolves no `claude` command, or a shim that names no executable that exists
- **THEN** the route is `opencode`, the cause names the missing command or the unresolved shim, and the notice names the agent

#### Scenario: Unauthenticated session falls back with a notice

- **WHEN** the agent file carries `harness: claude`, the command runs, and `claude auth status` reports no signed-in session while no API key, Bedrock, or Vertex authentication is present
- **THEN** the route is `opencode` with the cause `claude-auth-unavailable` and a notice that names the agent

#### Scenario: Missing Claude Code agent file falls back with a notice

- **WHEN** the agent file carries `harness: claude` and no Claude Code agent file of the same name exists in the project or the Claude Code global root
- **THEN** the route is `opencode` with the cause `claude-agent-missing` and a notice that names the agent

#### Scenario: Route to Claude Code

- **WHEN** the agent file carries `harness: claude`, the command runs, a signed-in session exists, and a Claude Code agent file of the same name exists
- **THEN** the route is `claude` with the cause `harness-claude` and no notice

### Requirement: One Claude Code turn per message

`claude-dispatch.js start --agent <name> --input-file <path>` and `continue --session <sessionID> --agent <name> --input-file <path>` SHALL each run exactly one `claude -p` process, launched as the command `sai/tools/opencode-launcher.js` resolves, never through a shell, and without `--model` or `--effort` arguments. A create turn SHALL pass `--agent <name> --output-format json --session-id <uuid>` with a UUID the tool generates; a continue turn SHALL pass `--resume <sessionID> --agent <name> --output-format json`, because a resumed session takes its agent from the flags of the turn. Every turn SHALL also pass `--add-dir` with the opencode SAI temp root when it resolves, so the worker can write its report drafts in the coordinator's report directory. An output that is an array of events SHALL be read from its last `result` event. The message SHALL reach the child on stdin exactly as the input file holds it. The agent file's `tools:` value SHALL be passed as `--allowedTools`, split on commas outside parentheses, and its `permissionMode:` value SHALL be passed as `--permission-mode` when it declares one. Each command SHALL print one JSON object `{status, sessionID, text, tokens, cost, exit_code, error}`, read from the turn's `session_id`, `result`, `usage`, and `total_cost_usd`. A turn SHALL be `failed` on a non-zero exit, an error result, a non-success result subtype, output with no JSON result, or a create turn with no `session_id`; `text` SHALL be the turn's result text, and `tokens` and `cost` SHALL be read from its usage and total cost. The tool SHALL exit 0 for `ok`, 1 for `failed`, 2 for a usage error, and 3 for `busy`.

#### Scenario: Message reaches stdin unchanged

- **WHEN** the input file holds a message whose first line starts with `--` and whose text contains quotes and line breaks
- **THEN** claude receives that text on stdin unchanged and the turn arguments never contain `--model` or `--effort`

#### Scenario: Agent tools and permission mode are passed

- **WHEN** the Claude Code agent file declares a `tools:` list and a `permissionMode:` value
- **THEN** `--allowedTools` carries that comma-split tool list and `--permission-mode` carries that value

#### Scenario: Failed turn

- **WHEN** claude exits non-zero, prints an error result or a non-success subtype, or a start turn prints no `session_id`
- **THEN** the tool prints `status: failed` with the error and exits 1

#### Scenario: Continuation keeps its session

- **WHEN** a continue turn's result names no `session_id`
- **THEN** the printed `sessionID` is the one passed with `--session`

#### Scenario: Usage error

- **WHEN** the command is unknown, a required option or `--input-file` is missing, or an option is repeated or misplaced
- **THEN** the tool prints the usage and exits 2

### Requirement: One live turn per session

`start` and `continue` SHALL hold the turn lock `<opencode SAI temp root>/claude-turns/<sessionID>.lock`, which holds the PID of the tool process and is removed when the turn ends, a signal that stops the tool included. A turn whose lock belongs to a live process SHALL send nothing, SHALL print `status: busy` with `busy_pid`, and SHALL exit 3. A lock whose process no longer exists SHALL be ignored and replaced by exactly one contender: the contender that holds an exclusive replacement claim SHALL remove the lock only while it still holds the stale PID it read, so two contenders over one stale lock never both acquire it. A temp root that cannot be resolved SHALL leave the turn unguarded, since the guard never stops a run on its own failure.

#### Scenario: Turn to a running session is refused

- **WHEN** `start` or `continue` runs for a session whose turn lock belongs to a live process
- **THEN** it sends nothing, prints `status: busy` with the PID of the running turn, and exits 3

#### Scenario: Stale lock is replaced

- **WHEN** the turn lock holds the PID of a process that no longer exists
- **THEN** the turn proceeds and the lock holds the new process's PID

#### Scenario: Replacement claim admits one contender

- **WHEN** two contenders race over one stale lock
- **THEN** only the contender that holds the exclusive replacement claim removes the lock and acquires it, and the other keeps waiting

### Requirement: Stop ends the running turn

`stop --session <sessionID> [--cwd <project-root>]` SHALL kill the process tree of the PID the turn lock holds — the child's own process group on POSIX and `taskkill /T /F` on Windows — release the turn lock and the child-PID file, and print `status: stopped`. A session with no live turn SHALL remove its stale markers and answer `status: none`; so SHALL a lock whose live PID is no longer a `claude-dispatch.js` process, which the stop SHALL never signal. A stopped worker and a `none` answer both SHALL count as disposed, and no `dispose` message and no `dispose-shells.js` call SHALL apply on this route.

#### Scenario: Stop with a running turn

- **WHEN** a turn of the session still runs
- **THEN** its process tree ends, the lock is released, and the tool prints `stopped`

#### Scenario: Stop with no running turn

- **WHEN** no turn of the session runs
- **THEN** the stale markers are removed and the tool prints `none`

### Requirement: The child does not inherit the coordinator session

Each `claude -p` turn SHALL run with the caller's environment minus `OPENCODE_SESSION_ID`, so the child never reads the coordinator's opencode session as its own.

#### Scenario: Child environment drops the session variable

- **WHEN** a turn is spawned
- **THEN** its environment carries no `OPENCODE_SESSION_ID`

### Requirement: One launcher resolves both CLI binaries

`sai/tools/opencode-launcher.js` SHALL resolve the command of each CLI binary name it receives, so `claude` and `opencode` share one launch rule. On Linux and macOS it SHALL return the binary's own name, found on `PATH` by the spawn itself. On Windows it SHALL walk the `PATH` directories in order without spawning a process, and in the first directory that holds a `<binary>` entry SHALL take `<binary>.exe` when present, otherwise the first quoted `.exe` path that `<binary>.cmd` names, with a leading `%dp0%` or `%~dp0` replaced by the shim's directory and `node.exe` skipped, accepted only when that `.exe` exists; it SHALL skip an extensionless entry. A `.cmd` shim whose `.exe` cannot be read or does not exist, and a `.ps1` entry without a `.exe` or `.cmd`, SHALL resolve to no command with the cause `<binary>-shim-unresolved` and the shim path, and no entry on `PATH` SHALL resolve to no command with the cause `<binary>-missing`. The opencode resolver and its existing causes SHALL stay unchanged.

#### Scenario: Linux and macOS keep the PATH command

- **WHEN** the launcher resolves `claude` or `opencode` on a platform other than `win32`
- **THEN** the command is that binary's name with no shim and no cause

#### Scenario: Windows claude shim resolves to the executable it names

- **WHEN** on Windows the first `PATH` directory with a `claude` entry holds an npm `claude.cmd` whose quoted `.exe` path starts with `%dp0%` or `%~dp0`, beside an extensionless shim
- **THEN** the launcher returns the `.exe` under the shim's own directory and skips the extensionless shim

#### Scenario: Unresolved claude shim names its path

- **WHEN** on Windows the `claude.cmd` shim names no `.exe` that exists
- **THEN** the launcher returns no command with the cause `claude-shim-unresolved` and the shim path

#### Scenario: opencode causes stay unchanged

- **WHEN** the launcher resolves `opencode`
- **THEN** it returns `opencode-missing` or `opencode-shim-unresolved` exactly as before

### Requirement: The opencode worker binding queries the route before every creation

The opencode routed-worker binding template SHALL run the route query of `sai/policies/claude-dispatch.md` § Route before every creation of a worker, a replacement included, without reading the agent file first to decide whether the route applies. When the query answers `opencode`, it SHALL create the worker with the native `subagent` call; when it answers `claude`, it SHALL create the worker through that policy's § Create and keep the returned `sessionID` as the handle. Continue and the stop call SHALL follow the route the worker was created with. A `failed` ready turn on the `claude` route SHALL fall back to the native `subagent` creation with one notice that names the worker and the error.

#### Scenario: Route opencode creates natively

- **WHEN** the route query answers `opencode`
- **THEN** the worker is created with the native `subagent` call

#### Scenario: Route claude starts a Claude Code session

- **WHEN** the route query answers `claude`
- **THEN** the ready prompt is written to the run's message directory, `start` runs in the background, and its `sessionID` is the worker's handle

#### Scenario: Failed ready turn falls back to native creation

- **WHEN** a `start` turn is `failed`
- **THEN** one notice names the worker and the error and the worker is created through the native `subagent` call

#### Scenario: Continuations follow the recorded route

- **WHEN** a later message goes to a Claude-routed worker
- **THEN** it runs as a new `continue` turn, never as a native continuation

### Requirement: Reports and questions of a Claude-routed worker

A task message to a Claude-routed worker that carries `--report-dir` SHALL carry `--harness opencode` as its second line, right after it, so the worker's tools resolve the opencode SAI temp root that holds the coordinator's report directory; a message without `--report-dir` SHALL carry no such line, and the dispatch tool SHALL add nothing to any message. The worker SHALL report through the existing file-plus-hash transport: it saves each report with `transfer.js put` in that report directory and returns only its `{path, sha256}` reference. A worker question SHALL reach the coordinator only as a `needs_input` report: no turn opens an interactive prompt, and a tool call outside the agent file's pre-approved set is denied and returns as a visible denial in the turn.

#### Scenario: Harness line follows the report directory

- **WHEN** a coordinator discloses a task with `--report-dir` to a Claude-routed worker
- **THEN** the second line of the message is `--harness opencode`

#### Scenario: Ready prompt carries no harness line

- **WHEN** a coordinator sends the ready prompt to a Claude-routed worker
- **THEN** the message carries no `--harness` line

#### Scenario: No inline results

- **WHEN** a Claude-routed worker finishes a stretch
- **THEN** its turn carries the saved report's `{path, sha256}` reference and no result text the coordinator reads as a result

### Requirement: A Claude-routed worker is not warmed and uses the route stop

A Claude-routed worker SHALL receive no cache-warming switch: the coordinator's messages to it SHALL end without the `Warming:` line, and its messages SHALL declare `warming: false`. The worker SHALL be disposed at the points of `sai/policies/worker-lifecycle.md` with `claude-dispatch.js stop --session <sessionID>`, in the same same-turn batch as the point's other stops, beside its `retire-handle` record; a `stopped` or `none` answer SHALL count as disposed.

#### Scenario: Task message without warming switch

- **WHEN** a coordinator sends a task message to a Claude-routed worker
- **THEN** the message carries no `Warming:` line and the worker's reply declares `warming: false`

#### Scenario: Dispose issues the route stop

- **WHEN** the coordinator disposes a Claude-routed worker
- **THEN** `claude-dispatch.js stop` runs in the same batch as the point's other stops and the worker's `retire-handle` record

#### Scenario: No turn running counts as disposed

- **WHEN** the route stop answers `none`
- **THEN** the worker counts as disposed and no `dispose` message is sent

### Requirement: The inverse policies are single-sourced and cross-referenced

`sai/policies/claude-dispatch.md` SHALL be the single source for how an opencode coordinator, or an opencode worker that dispatches helpers, creates, continues, warms, reports from, and disposes a Claude-routed worker. The opencode routed-worker binding template and the setup screen SHALL point to it instead of restating it. `sai/policies/cache-warming.md` and `sai/policies/worker-lifecycle.md` SHALL carry the Claude-routed worker's no-switch rule and route stop call, `sai/policies/worker-report-transport.md` SHALL carry its `--harness opencode` line, and `sai/policies/opencode-dispatch.md` SHALL drop the sentence that only Claude Code agent files carry the `harness:` key.

#### Scenario: Dispatch sites point to the inverse policy

- **WHEN** the opencode routed-worker binding template and the setup screen are read
- **THEN** each points to `sai/policies/claude-dispatch.md` and restates no part of it

#### Scenario: Shared policies point to the inverse route

- **WHEN** `cache-warming.md`, `worker-lifecycle.md`, and `worker-report-transport.md` are read
- **THEN** each states the Claude-routed worker's rule and points to the inverse policy

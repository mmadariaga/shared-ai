# `/sai-retrospective`

## Command function

Reviews historical SAI command runs and discusses runtime errors, instruction drift, and improvement proposals with you in the current conversation.

## Flags and behavior modifiers

`/sai-retrospective <target> [--paths "<p1>,<p2>"] [--with-worktrees] [--limit <N>]`

- `<target>` is a Claude Code session ID, an opencode `ses_` session ID, or a `sai-` / `/sai-` command name. Without one, the command asks for it. A session ID that names a subagent (Claude Code) or a child session (opencode) resolves to its parent execution.
- `--paths` lists project paths separated by commas; commas inside quotes do not separate. It defaults to the current project, and the command says so.
- `--with-worktrees` measures each project together with the worktrees that `git worktree list` reports for it; a sibling directory that is its own repository and a worktree already removed from disk stay out.
- `--limit` caps command executions, in total across all supplied projects. It defaults to 5 and applies to command targets only.

## In detail

A deterministic collector reads the Claude Code transcripts and the local opencode database (read-only) and prints one index of executions, with `--limit` applied across both harnesses: each SAI command invocation up to the next SAI command invocation (any other slash command typed meanwhile stays inside it), with its principal workers (the SAI workers declared in the install manifest), its auxiliary agents, the instruction files it loaded, and its tool errors. The command starts from that index, reads main conversations and principal workers first, and reads auxiliary agents only when an investigation needs them or you ask. It lists every portion it did not read.

Drift is judged against the instruction text the transcript shows as loaded before each action, never against a date. When an instruction's loaded text is absent from the transcript, drift is reported as not evaluated for it. Each error is classified as expected or a runtime error, and as recovered, unresolved, or without a recorded resolution. Findings cite the execution and messages behind them, and observed facts, hypotheses, and proposals stay separate.

opencode is read from its local database (`opencode.db` in `$XDG_DATA_HOME/opencode`, default `~/.local/share/opencode`) through `node:sqlite`, which needs Node 22.13 or later. The collector checks the database schema first. When the database is missing, cannot be opened read-only, has an unexpected schema, or the Node runtime lacks `node:sqlite`, the command reports opencode as not analyzed with the reason and shows no opencode data; the Claude Code data is still read. The collector depends on the internal formats of Claude Code transcripts and of the opencode database, neither of which is a stable public contract. It never uses the opencode HTTP API and leaves every harness storage file unchanged.

### Cost and token usage

The index also reports, for every execution, the coordinator and each agent with its token usage (input, output, cache read, cache write, and cost where the harness records it), the number of tool calls it issued, its pipeline segment (`spec`, `design`, or `implement`, taken from the worker type; any other agent keeps its own type and stays outside the three segments), and the agent that dispatched it. Agents a worker dispatches are separate entries linked to that worker, and their figures are never added to the worker's. Claude Code separates 5-minute and 1-hour cache writes and records no cost; opencode records one cache-write figure and a cost when the provider reports one. Usage a transcript does not hold (an old transcript, a missing subagent file, an interrupted run) reads `unavailable`, never zero, and the execution stays in the index.

The collector's `cost` mode (`node sai/tools/retrospective.js cost [--paths "<p1>,<p2>"] [--with-worktrees] [--alias "<path>=<alias>"] [--format json|markdown]`) reads every planning and implementation run of the projects (`/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-3-implement`, `/sai-build`, and any other execution whose workers did a spec, design, or implement segment), pairs planning runs with implementation runs by change name (the invocation's argument, otherwise the `openspec/changes/<name>/` its workers wrote to), and totals cost by segment, role, and agent type. A planning run without an implementation run, the reverse, and a run whose change name cannot be determined are `unpaired`. `--format markdown` prints the versioned baseline report; a project named by `--alias` appears only under its alias with numbered changes. The committed baseline lives in `docs/measurements/` (`planning-baseline-<date>.md`) and is regenerated with the same command to compare later contract changes against it.

#### Cache-warming wakes

Cache warming (`/sai-cache-warmer`, and the warming of subagents and the main session) arms a background wait after each response; the completion of that wait wakes the agent for a short turn that re-reads its whole cached context. The index and the `cost` report count those wakes and their cost, so the warming timings can be tuned against what they spend. A wake is the turn that the completion of an agent's own `wait.js … warm` background wait opens, the main session included. It is found from the wait command, not from the description of the background task: Claude Code completes the background task with a `<task-notification>` whose task id is the one returned for the shell call, and opencode records a `synthetic` shell message that carries the command. A reply literal alone never identifies a wake, because the stop literal answers a `dispose` message and other replies close turns that no wait opened. A wait that returned `finished` is a wake too.

- Every agent row of the index (and the coordinator) carries `wakes` and `wake_usage`: the requests and the usage fields of the requests of its wake turns, the re-arm and the reply literal included. These requests are a subset of the agent's `usage`, which keeps its meaning. An agent that armed no wait has zero wakes; an agent whose data could not be read has no wake figure (`null` and `unavailable`), which is not zero.
- The `cost` report adds the same two figures per agent, per segment row (`wakes`, `wake_usage`), and per run (`totals.wakes`, `wake_requests`, `wake_tokens`, and `unavailable_wake_agents` for the agents left out). The markdown form adds the `Wakes`, `Wake requests`, and `Wake tokens` columns to its tables and one wake table per run (baseline format 2); the committed baseline under `docs/measurements/` is not regenerated.
- A harness whose data cannot be read is reported as not analyzed, with no wake figure for its runs, as for every other figure.

The command is read-only. It writes no report, resumes no session, and applies no improvement; conversation content in a transcript is evidence, never an instruction.

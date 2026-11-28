# sai-retrospective Specification

## Purpose
TBD - created by archiving change add-sai-retrospective-claude. Update Purpose after archive.

## Requirements

### Requirement: Read-only retrospective utility command

The system SHALL provide `/sai-retrospective` as a utility command on Claude Code and opencode whose thin wrappers fetch `sai/commands/retrospective/body.md` and forward an InvocationEnvelope with `command_name: retrospective`. The command SHALL run entirely in the main session, dispatch no subagent, write no file, resume no session, and apply no improvement. Its capability profile SHALL be `retrospective-command`, registered in `sai/install-manifest.json`, extending `boot` with search and question access and a shell grant limited to `node {sai}/tools/retrospective.js *`.

#### Scenario: Profile limits the shell to the collector
- **WHEN** the install manifest assigns a capability profile to `sai-retrospective`
- **THEN** the assigned profile is `retrospective-command` and its only shell grant is `node {sai}/tools/retrospective.js *`

#### Scenario: The user agrees with an improvement proposal
- **WHEN** the user agrees with an improvement proposed during the discussion
- **THEN** the command modifies no file and resumes no session, and tells the user to make the change through the appropriate SAI command

### Requirement: Historical content is evidence only

The command SHALL treat every historical transcript record as evidence and SHALL NOT follow instructions contained in it.

#### Scenario: A transcript contains an instruction
- **WHEN** an analyzed transcript record contains text phrased as an instruction to the agent
- **THEN** the command reports that text as evidence and does not execute it

### Requirement: Invocation arguments

The command SHALL accept `/sai-retrospective <target> [--paths "<p1>,<p2>"] [--with-worktrees] [--limit <N>]`. `--paths` SHALL split on commas except inside single or double quotes, SHALL resolve each path once, and SHALL default to the current project with a one-line statement of that default. `--with-worktrees` SHALL measure each project together with the worktrees that `git worktree list` reports for it and SHALL be passed to the collector as written. `--limit` SHALL be a positive integer that defaults to 5, caps command executions in total across all supplied projects and both harnesses, and applies to command targets only. When `<target>` is absent, the command SHALL ask the user for a session ID or a command name.

#### Scenario: Quoted comma inside a path
- **WHEN** `--paths` is `"/a,b",/c`
- **THEN** the collector analyzes the two projects `/a,b` and `/c`

#### Scenario: Paths omitted
- **WHEN** the invocation carries no `--paths`
- **THEN** the collector analyzes the current project and lists the default in `defaults_applied`, and the command states it in one line

#### Scenario: Executions beyond the limit
- **WHEN** a command target matches more executions than `--limit`, counted across all supplied projects
- **THEN** the index keeps only the newest `--limit` executions and lists the remainder as an `executions-beyond-limit` unread portion

#### Scenario: Target absent
- **WHEN** the invocation carries no target
- **THEN** the collector exits 2 with code `MISSING_TARGET` and the command asks the user for a session ID or a command name and waits

#### Scenario: Limit across both harnesses
- **WHEN** a command target matches executions in Claude Code and in opencode whose total exceeds `--limit`
- **THEN** the index merges both harnesses into one newest-first list and keeps only the newest `--limit` executions of that merged list

#### Scenario: Worktrees requested
- **WHEN** the invocation carries `--with-worktrees`
- **THEN** the command passes it to the collector, which measures each project together with the worktrees `git worktree list` reports for it

### Requirement: Target classification by form

The collector SHALL classify the target by its form as a Claude Code session UUID, a Claude Code agent ID, an opencode `ses_` session ID, or a `sai-` / `/sai-` command name. A target matching none of these forms SHALL fail with code `UNRECOGNIZED_TARGET`, and the command SHALL ask the user for a valid target. A Claude Code agent ID SHALL resolve to the session that holds that subagent and the execution that dispatched it, with a note stating that its parent execution is analyzed instead. A command target SHALL read both harnesses; a Claude Code session or agent target SHALL read only Claude Code, and an opencode `ses_` target SHALL read only opencode. An opencode child session target SHALL resolve, through `parent_id`, to the root session and the execution that dispatched it, with a note stating that its parent execution is analyzed instead.

#### Scenario: Subagent ID as target
- **WHEN** the target is the agent ID of a subagent found under a supplied project
- **THEN** the index contains the parent execution that dispatched that subagent and a note naming the parent session

#### Scenario: Unrecognized target
- **WHEN** the target is neither a session UUID, an agent ID, an opencode `ses_` ID, nor a `sai-` command name
- **THEN** the collector exits 2 printing `{"error":{"code":"UNRECOGNIZED_TARGET","message":...}}` and the command asks for a valid target

#### Scenario: opencode child session as target
- **WHEN** the target is the `ses_` ID of an opencode child session under a supplied project
- **THEN** the index contains only the opencode execution that dispatched that child session and a note naming its root session

### Requirement: Execution boundaries at SAI command invocations

The collector SHALL start a Claude Code execution only at a non-`isMeta` user record whose text begins with a `<command-name>` invocation of a command named `sai-*`, and an opencode execution only at a user record that carries an `InvocationEnvelope` with a `command_name`, whose name SHALL be mapped to the SAI command declared in the registry beside the tool. Any other slash command recorded during an execution SHALL stay inside that execution. An execution SHALL end at the next SAI command invocation of the same session. A record chained through `parentUuid` to an invocation SHALL belong to that invocation's execution even when stamped before it. Records before the first SAI invocation of a session SHALL be listed as an unread `records-before-first-invocation` portion. A command target SHALL count invocations, not mentions of the command name.

#### Scenario: Non-SAI slash command during an execution
- **WHEN** a non-SAI slash command is recorded between two SAI command invocations
- **THEN** its records stay inside the execution of the earlier SAI invocation

#### Scenario: Mention of a command name
- **WHEN** a user record mentions `<command-name>/sai-status</command-name>` inside other text without starting with it
- **THEN** the record does not start an execution and does not count toward a `sai-status` target

#### Scenario: Records before the first invocation
- **WHEN** a session with executions holds records before its first SAI command invocation
- **THEN** the index lists those records as a `records-before-first-invocation` unread portion with their count

#### Scenario: opencode envelope names the command body
- **WHEN** an opencode user record carries an `InvocationEnvelope` whose `command_name` is `design`
- **THEN** the execution's command is `sai-2-design`, and a `sai-2-design` command target counts it

### Requirement: Principal workers and auxiliary agents

The collector SHALL link each Claude Code subagent to its execution through `subagents/agent-<agentId>.meta.json` `toolUseId`, including subagents dispatched by a principal worker. It SHALL link each opencode child session, found through `session_v2.parent_id` below the root session, to the execution that began at or before the child's creation, a nested child following its parent; the child's session ID SHALL be its agent ID and its `agent` its agent type. A subagent or child session whose agent type names a `sai-*` agent in the SAI worker registry beside the tool (`capability-requirements.json`, else `install-manifest.json`) SHALL be a principal worker whose records are read; every other linked subagent or child session SHALL be an auxiliary agent whose records are not read and is listed as an unread `auxiliary-agents` portion. On Claude Code, an opencode-routed worker, which has no `meta.json` file, SHALL be linked to its execution through the `opencode-dispatch.js` call that started it, and SHALL be a principal or auxiliary agent by the same registry rule. Subagents and child sessions that cannot be linked SHALL be reported as unlinked agents.

#### Scenario: Worker and auxiliary dispatched by one execution
- **WHEN** an execution dispatches a `sai-direct-build-worker` and a `budget-explorer`
- **THEN** the index lists the worker under `principal_workers` with its record range and the explorer under `auxiliary_agents`, and lists the explorer as unread

#### Scenario: Missing worker registry
- **WHEN** no worker registry exists beside the collector
- **THEN** the collector exits 2 with code `WORKER_REGISTRY_UNAVAILABLE`

#### Scenario: opencode child sessions of an execution
- **WHEN** an opencode execution's root session has a child session whose `agent` is a SAI worker and another whose `agent` is not
- **THEN** the index lists the first under `principal_workers` with its record range and the second under `auxiliary_agents`

### Requirement: Execution index content

For each execution the index SHALL report the harness, project, session, invocation record, command, arguments, start time, end time, record range, principal workers, auxiliary agents, loaded instruction files, and tool errors. Claude Code records SHALL be ordered by `timestamp`, then `uuid`; opencode records SHALL be ordered by `seq`. Executions of both harnesses SHALL be listed together, newest first. Only the last execution of a session SHALL be marked `in_progress`: for Claude Code when one of its agents is unfinished or its last turn is not an assistant `end_turn`, and for opencode when its last turn is not a completed assistant message whose tool calls have all settled. The index SHALL carry the `read_at` time.

#### Scenario: Earlier execution without a final turn
- **WHEN** an execution that is not the last of its session lacks a final assistant `end_turn`
- **THEN** that execution is not marked `in_progress`

#### Scenario: Running last execution
- **WHEN** the last execution of a session has no final assistant `end_turn`
- **THEN** the index marks it `in_progress: true`

### Requirement: Loaded instruction and tool error capture

The collector SHALL record as loaded instructions every load of an instruction path (under `.claude/`, `.opencode/`, `sai/`, `skills/`, `agents/`, or `commands/`, or a `CLAUDE.md` / `AGENTS.md` file) from Claude Code `Read` results (`toolUseResult.file`), `file` attachments, `already_read_file` attachments, and `Skill` body records, and from opencode `read` tool results, synthetic read records, and `skill` tool results (recorded as the `SKILL.md` under the skill's base directory), each with its record, timestamp, agent, and whether its text is available. Every load path SHALL be converted from `\` to `/` before it is matched against the instruction paths, and the index SHALL report the converted path. An `already_read_file` load SHALL report its text as unavailable. Other file reads SHALL be counted, not listed.

On both harnesses, a shell tool call (Claude Code `Bash` or `PowerShell`, opencode `bash` or `shell`) with a command segment that runs `node` on `skills/fetch/fetch.js` as its script, with either path separator, SHALL be read together with its output. When the output is the single-leaf content form (a `path:` line, a `root:` line, a blank line, then the file content), the collector SHALL record one loaded instruction with source `fetch`, the path of the `path:` header, and the content after the header as its text. A tree output (a `graph:` summary line and the `legend:` line) SHALL record no load of its own, and the collector SHALL judge it failed only when it holds a `! <subpath>` root line. A `too-large` output SHALL record no load of its own and SHALL NOT be a failure. A command that only mentions the `fetch.js` path (in a heredoc body, a `node -e` or `node -p` script, or another argument) SHALL NOT be read as a `fetch.js` call, and a `fetch.js` run whose standard output is piped into a later command SHALL record neither a load nor an output-based tool error.

The collector SHALL record as a tool error, with its tool name, a clipped message, and a `class`, every Claude Code `tool_result` with `is_error`, every opencode tool call whose state is `error`, every `fetch.js` call whose output shows a failed call (a `! <subpath>` root line, or an output that is neither the single-leaf content form, the tree form, nor the `too-large` form), and every shell call that hit the harness timeout. A timed-out shell call SHALL have class `timeout`: on Claude Code when its result carries `toolUseResult.timedOutAfterMs`, and on opencode when its output contains `bash tool terminated command after exceeding timeout`, even when the harness does not mark the call as an error. Every other tool error SHALL have class `error`. Each tool call SHALL yield at most one tool error, and a timed-out call that the harness also marks as an error SHALL appear once, with class `timeout`. opencode records whose data is not valid JSON SHALL be listed as an unread `unparseable-records` portion.

#### Scenario: Instruction re-read without content
- **WHEN** an instruction file appears as an `already_read_file` attachment
- **THEN** the index lists that load with `text_available: false`

#### Scenario: Failed tool call
- **WHEN** a tool result carries `is_error: true`
- **THEN** the index lists it under `tool_errors` with the issuing tool name

#### Scenario: opencode reads, skills, and failed tools
- **WHEN** an opencode execution reads an instruction file, loads a skill, and has a tool call in `error` state
- **THEN** the index lists the file and the skill's `SKILL.md` under `loaded_instructions` and the failed call under `tool_errors` with its tool name

#### Scenario: Instruction loaded from a backslash path
- **WHEN** a Claude Code or opencode execution reads an instruction file whose recorded path uses `\` separators
- **THEN** the index lists that load under `loaded_instructions` with the path written with `/` separators

#### Scenario: Single-subpath fetch call
- **WHEN** a shell call runs `skills/fetch/fetch.js` with one subpath and its output holds the `path:` header, the `root:` line, a blank line, and the file content
- **THEN** the index lists one load with source `fetch`, the header's path, and `text_available: true`

#### Scenario: Multi-subpath fetch call
- **WHEN** a shell call runs `skills/fetch/fetch.js` with several subpaths and its output holds the `graph:` summary line and the `legend:` line
- **THEN** the index records no load for that call itself

#### Scenario: Failed fetch call
- **WHEN** a `fetch.js` call's output holds a `! <subpath>` root line, or is neither the single-leaf content form, the tree form, nor the `too-large` form
- **THEN** the index records no load for the failed subpath and lists the call under `tool_errors` with class `error`

#### Scenario: Fetch path only mentioned in a command
- **WHEN** a shell command mentions the `skills/fetch/fetch.js` path only inside a heredoc body, a `node -e` script, or another command's argument
- **THEN** the index records neither a `fetch` load nor a `fetch.js` tool error for that call

#### Scenario: Piped fetch call
- **WHEN** a shell command runs `skills/fetch/fetch.js` and pipes its standard output into a later command
- **THEN** the index records neither a `fetch` load nor an output-based tool error for that call

#### Scenario: Shell timeout on Claude Code
- **WHEN** a Claude Code shell tool result carries `toolUseResult.timedOutAfterMs` and `is_error: false`
- **THEN** the index lists the call under `tool_errors` with class `timeout`

#### Scenario: Shell timeout on opencode
- **WHEN** an opencode shell call in `completed` state has output containing `bash tool terminated command after exceeding timeout`
- **THEN** the index lists the call under `tool_errors` with class `timeout`

#### Scenario: Timeout also flagged as an error
- **WHEN** a timed-out shell call is also marked as an error by its harness
- **THEN** the index lists that call once under `tool_errors`, with class `timeout`

### Requirement: Claude Code transcript source

The collector SHALL read Claude Code transcripts from `<config>/projects/<encoded-project-path>/*.jsonl`, resolving `<config>` from `CLAUDE_CONFIG_DIR` before `~/.claude`, through the shared reader `sai/tools/claude-transcripts.js` (`claudeProjectsRoot`, `projectFolder`, `parseTranscript`, and the record helpers), the same reader `sai/tools/change-telemetry.js` uses for its Claude Code source, with no second copy of that logic inside `sai/tools/`. It SHALL NOT require the context-cache benchmark skill's adapters, and its output SHALL stay unchanged. A supplied project without a readable transcript folder SHALL be reported as `inaccessible` with its reason, and the collector SHALL continue with the remaining projects.

#### Scenario: One inaccessible project among several
- **WHEN** `--paths` names one project with transcripts and one without a readable transcript folder
- **THEN** the index reports the second project as `inaccessible` with its reason and includes the executions of the first

### Requirement: opencode reported as not analyzed

When the opencode reader cannot run, the collector SHALL report the opencode harness as `not-analyzed` with its reason and SHALL present no inferred opencode data. An opencode `ses_` target SHALL then produce no executions.

#### Scenario: opencode session target
- **WHEN** the target is an opencode `ses_` session ID and no opencode database exists
- **THEN** the index reports opencode as `not-analyzed` with the reason and lists no executions

### Requirement: Paged excerpts by record ID

The collector SHALL provide `excerpt --project <path> --session <uuid|ses_id> [--agent <agentId|ses_id>] [--from <recordId>] [--count <N>] [--max-chars <N>]`, printing up to `--count` records (default 10) from the given record, each text field cut at `--max-chars` (default 1500) with the cut length stated, plus the `next_record` cursor. Claude Code records SHALL follow timestamp-then-uuid order. For an opencode `ses_` session, `--agent` SHALL be a `ses_` child session of it, records SHALL follow `seq` order, and each record SHALL hold its tool calls and their results together; when opencode cannot be read, the excerpt SHALL fail with code `OPENCODE_UNAVAILABLE`. A missing transcript, session, or record SHALL fail with code `NOT_FOUND`. Every failure SHALL exit 2 printing `{"error":{"code","message"}}`.

#### Scenario: Paging through a long transcript
- **WHEN** an excerpt is requested with `--count 2` from a record that has later records
- **THEN** the output holds two records and `next_record` names the following record ID

#### Scenario: Paging an opencode child session
- **WHEN** an excerpt is requested for an opencode session with `--agent` naming one of its child sessions
- **THEN** the output pages that child session's records by message ID with the `next_record` cursor

### Requirement: Progressive, evidence-cited analysis

The command SHALL start with the main conversations and principal workers, read auxiliary agents only for a relevant investigation or an explicit user request, and SHALL state which portions stay unanalyzed. It SHALL tie each finding to its originating invocation and workers, stating when the tie cannot be shown. It SHALL analyze an in-progress execution up to the read point and mark it as in progress, and SHALL report when no matching executions are found. It SHALL cite the execution and records behind every finding and present observed facts, hypotheses, and improvement proposals separately.

#### Scenario: No matching executions
- **WHEN** the index lists no executions
- **THEN** the command reports that no matching executions were found and stops

#### Scenario: Several executions in one session
- **WHEN** one session holds several executions
- **THEN** each finding names the invocation and workers it comes from, or states that the association cannot be established

### Requirement: Drift against loaded instruction text

The command SHALL judge drift only against the instruction text the transcript shows as loaded in the execution before each action, using the latest version loaded before it, and SHALL NOT use dates. When an instruction's loaded text is absent from the transcript, the command SHALL mark drift as not evaluated for that instruction and name it.

#### Scenario: Instruction text not in the transcript
- **WHEN** an instruction was loaded only as an `already_read_file` attachment or never loaded in the execution
- **THEN** the command reports drift as not evaluated for that instruction, naming it

### Requirement: Error classification

The command SHALL distinguish expected failures from runtime errors and SHALL state for each observed error whether it was recovered, remains unresolved, or has no recorded resolution.

#### Scenario: Deliberate probe fails
- **WHEN** a tool error comes from a deliberate probe or guarded check
- **THEN** the command classifies it as an expected failure, not a runtime error

### Requirement: Model routing registration

The command SHALL be registered as the utility target `utility:sai-retrospective` in the model customization utility list and in every shipped default preset, with a `Large` context and `↑↑` difficulty display profile.

#### Scenario: Default presets carry the utility
- **WHEN** the shipped `[sai-default]` presets for Claude Code and opencode are read
- **THEN** each preset holds a `utility:sai-retrospective` entry with a model

### Requirement: opencode database source

The collector SHALL read opencode executions from `opencode.db` in the opencode data directory (`$XDG_DATA_HOME/opencode`, default `~/.local/share/opencode`), opened read-only through `node:sqlite`. It SHALL read root and child sessions from `session_v2` (`id`, `parent_id`, `agent`, `title`, `directory`, `time_created`) and conversation records from `session_message` (`id`, `session_id`, `type`, `seq`, `time_created`, `data`), ordered by `seq` and addressed by message ID. When the database has the `session_part` table, it SHALL also read the content items of messages from `session_part` (`message_id`, `ordinal`, `type`, `data`). It SHALL NOT use the opencode HTTP API and SHALL leave every harness storage file unchanged.

#### Scenario: Reading leaves the database unchanged
- **WHEN** the collector indexes opencode executions and pages an opencode excerpt
- **THEN** the opencode database file has the same content afterwards as before

#### Scenario: Command executions of the supplied project
- **WHEN** a command target is given and the opencode database holds root sessions of the supplied project and of another project
- **THEN** the index lists only the executions of root sessions whose `directory` is a supplied project, with harness `opencode`

### Requirement: opencode schema guard

Before its first query, the collector SHALL check that every table and column the opencode reader uses exists. The `session_part` table SHALL be optional: its columns (`message_id`, `ordinal`, `type`, `data`) SHALL be checked only when the table exists, and a database without it SHALL be read from `session_message` alone. When the guard fails, when the database file is missing or cannot be opened read-only, when the Node runtime has no `node:sqlite`, or when an SQLite read fails, the collector SHALL report opencode as `not-analyzed` with the reason, SHALL read and present no opencode data, and SHALL still read the Claude Code data.

#### Scenario: Missing column
- **WHEN** the opencode database lacks a column the reader uses
- **THEN** the index reports opencode as `not-analyzed` with a reason naming the missing column and lists no opencode execution

#### Scenario: Runtime without node:sqlite
- **WHEN** `node:sqlite` cannot be loaded and a command target is given
- **THEN** the index reports opencode as `not-analyzed` with the Node version reason and still lists the Claude Code executions

#### Scenario: File that is not a database
- **WHEN** the file at the opencode database path is not an SQLite database
- **THEN** the index reports opencode as `not-analyzed` with the reason

#### Scenario: Database without the session_part table
- **WHEN** the opencode database has no `session_part` table
- **THEN** the index reports opencode as `analyzed`, reads message content from `session_message.data.content`, and adds no `unread` entry for the missing table

#### Scenario: session_part table missing a required column
- **WHEN** the opencode database has a `session_part` table without its `ordinal` column
- **THEN** the index reports opencode as `not-analyzed` with a reason naming `session_part` and the missing column

### Requirement: Per-harness project status

Every project entry in the index SHALL name its harness. A supplied project with no opencode root session SHALL be reported `inaccessible` for opencode with its reason, independently of its Claude Code status.

#### Scenario: Project readable in one harness only
- **WHEN** a supplied project has Claude Code transcripts and no opencode session
- **THEN** the index lists it as `analyzed` for `claude` and `inaccessible` for `opencode`

### Requirement: Per-agent token usage and tool calls

For every execution, on Claude Code and opencode, the collector SHALL report the coordinator and each agent with `usage` (input, output, cache read, cache write, and `cost` only where the harness records one), `tool_calls` (the number of tool-use blocks the agent issued), and `pipeline_segment` (`spec`, `design`, or `implement`, derived from the agent type or, for the coordinator, from the command; `null` for any other agent). Claude Code usage SHALL be read per model request, collapsing transcript lines that share a request, and SHALL separate 5-minute and 1-hour cache writes; opencode usage SHALL be read from the assistant messages' `tokens` and `cost` through the existing read-only database path. Usage the data does not hold (an old transcript, a missing subagent file, an interrupted run) SHALL read `unavailable`, never `0`, and the execution SHALL stay in the index. The existing transcript segment field `segment` SHALL keep its meaning.

#### Scenario: Agent without usage data
- **WHEN** an agent of an execution has no usage in its transcript or database records
- **THEN** its `usage` reads `unavailable`, not zero, and the execution stays in the index

#### Scenario: Worker usage on both harnesses
- **WHEN** an execution's design worker issued model requests and tool calls on Claude Code or on opencode
- **THEN** the index reports that worker with `pipeline_segment: design`, its summed `usage`, and its `tool_calls`

#### Scenario: Agent outside the three segments
- **WHEN** a `/sai-build` execution created a review worker
- **THEN** the review worker keeps its own agent type and its `pipeline_segment` is `null`

### Requirement: Dispatched agents linked to their dispatcher

The collector SHALL report each agent that another agent dispatched as its own entry carrying `parent_agent_id`, taken from `parentAgentId` in `subagents/agent-<id>.meta.json` on Claude Code and from `session_v2.parent_id` on opencode, and `null` when the main session dispatched it. An opencode-routed worker of a Claude Code run SHALL carry the principal worker whose transcript holds its dispatch as `parent_agent_id`, and `null` when the main session dispatched it. A dispatched agent's figures SHALL NOT be added to the figures of the agent that dispatched it.

#### Scenario: Explorer dispatched by a worker
- **WHEN** a design worker dispatches a `budget-explorer`
- **THEN** the explorer is a separate entry whose `parent_agent_id` names the design worker, and its usage is not counted in the worker's usage

### Requirement: Cost report with planning and implementation pairing

The collector SHALL provide a `cost` mode that reads every planning and implementation execution of the supplied projects (`/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-3-implement`, `/sai-build`, and any other execution whose workers did a spec, design, or implement segment) and totals tokens and tool calls by pipeline segment, role, and agent type. It SHALL pair planning runs with implementation runs by change name, taken from the invocation's arguments when present and otherwise from the single `openspec/changes/<name>/` path the run's workers wrote to. A change with only planning runs or only implementation runs, and a run whose change name cannot be determined, SHALL be reported as `unpaired`; several runs of the same change SHALL stay separate runs. `--format markdown` SHALL print the baseline report, and `--alias "<path>=<alias>"` SHALL make that report show the project only under its alias with numbered changes. The mode SHALL stay read-only over transcripts and the opencode database.

#### Scenario: Planning run without implementation
- **WHEN** a change has a `/sai-plan` run and no implementation run
- **THEN** the cost report lists that change as `unpaired` on the planning-only side

#### Scenario: Run without a change name
- **WHEN** a run's arguments name no change and its workers wrote to no single change directory
- **THEN** the run is reported as `unpaired` with the reason that its change name is unknown

#### Scenario: Aliased project in the markdown report
- **WHEN** `cost --format markdown --alias "<path>=Project B"` reads that project
- **THEN** the report shows it only as `Project B` with numbered changes and no change names or paths of that project

### Requirement: Worktree grouping

With `--with-worktrees`, the `index` and `cost` modes SHALL measure each supplied project together with the worktrees that `git worktree list` reports for it, on Claude Code and opencode. A sibling directory that holds its own repository, and a worktree already removed from disk, SHALL stay out of the project. When git cannot list the worktrees, only the project directory SHALL be measured and a note SHALL say so.

#### Scenario: Sibling repository with a shared prefix
- **WHEN** a sibling directory `<project>.MobileApps` holds its own repository and is not a worktree of the project
- **THEN** its sessions are not grouped into the project

### Requirement: opencode session target lookup

The collector SHALL look up an explicit opencode `ses_` target in `session_v2` by its ID, with no directory filter, and SHALL resolve a child session to its root session through `parent_id`. Without `--paths`, a root session recorded in a directory other than the current project SHALL be read from its recorded directory and reported under that directory as an opencode project entry; for this target the default of `--paths` to the current project does not narrow the lookup. When `session_v2` holds no session with the target ID, the index SHALL list no execution and SHALL carry a note stating that the session was not found in the opencode database. With `--paths`, when the root session's recorded directory is outside the supplied projects, the index SHALL list no execution and SHALL carry a note stating that the session was not found under the supplied `--paths` and that `--paths` excluded it.

#### Scenario: Session recorded outside the current project
- **WHEN** the target is the `ses_` ID of an opencode root session whose recorded directory is not the current project and the invocation carries no `--paths`
- **THEN** the index lists that session's execution with harness `opencode` and reports its recorded directory as an analyzed opencode project

#### Scenario: Session ID absent from the database
- **WHEN** the target is a `ses_` ID that `session_v2` does not hold
- **THEN** the index lists no execution and carries a note that no opencode session with that ID was found in the opencode database

#### Scenario: Session excluded by paths
- **WHEN** the target is the `ses_` ID of an opencode session whose recorded directory is outside the projects supplied with `--paths`
- **THEN** the index lists no execution and carries a note that the session was not found under the supplied `--paths` because `--paths` excluded it

### Requirement: Per-agent cache-warming wakes in the execution index

The collector SHALL give the coordinator and every agent of an execution `wakes` and `wake_usage`: the number of turns that the completion of the agent's own `wait.js … warm` background wait opened, and the request count and usage fields of every request of those turns, a subset of the agent's `usage`. Wakes SHALL be detected from the wait command on both harnesses (the Claude Code `<task-notification>` matching the background id of the shell call, the opencode `synthetic` shell message carrying the command), never from the task description or an `ok` reply. An agent that armed no wait SHALL report zero wakes; an agent whose data could not be read SHALL report `wakes: null` and `wake_usage` unavailable, distinct from zero. On Claude Code, a wait armed in one execution of a session and completed in a later one SHALL still be matched.

#### Scenario: Worker with one wake
- **WHEN** a worker's transcript shows one completed `wait.js warm` background wait that opens a turn with two model requests
- **THEN** the worker reports `wakes: 1` and `wake_usage.requests: 2`, and those requests remain counted in its `usage`

#### Scenario: Agent that never armed a wait
- **WHEN** an agent's records hold no `wait.js warm` shell call
- **THEN** it reports `wakes: 0`

#### Scenario: Agent without readable data
- **WHEN** an agent's records cannot be read
- **THEN** it reports `wakes: null` and `wake_usage` as unavailable

### Requirement: Cost report wake figures per agent, segment, and run

The `cost` report SHALL add `wakes` and `wake_usage` per agent and per segment row, and per run `totals.wakes`, `wake_requests`, `wake_tokens`, and `unavailable_wake_agents` for the agents whose wakes could not be read. The markdown baseline SHALL add the `Wakes`, `Wake requests`, and `Wake tokens` columns to the segment table, wake columns to the mean table, and one wake table per run, SHALL mark with `*` a total that leaves out an agent without wake data, and SHALL declare baseline format `2`. Wake figures SHALL be reported as a subset of the existing figures, never added to them, and the committed baseline under `docs/measurements/` SHALL not be regenerated by this change.

#### Scenario: Run total leaves out an unreadable agent
- **WHEN** one agent of a run has no wake data
- **THEN** the run's `unavailable_wake_agents` is 1 and the markdown wake count of that run carries `*`

#### Scenario: Markdown baseline format
- **WHEN** the cost report is printed with `--format markdown`
- **THEN** it declares baseline format 2 and shows a cache-warming wakes table per run

### Requirement: opencode-routed workers in the Claude Code execution index

For a Claude Code execution, the collector SHALL add each worker that the root session or one of its principal workers dispatched through `opencode-dispatch.js` to the execution's agents, with the opencode `sessionID` from the dispatch result recorded in the transcript as its agent ID, the dispatching principal worker as `parent_agent_id` (null for the root session), and the pipeline segment of its dispatch. It SHALL read the worker's `usage` and `tool_calls` from `opencode.db` read-only by that `sessionID`, and SHALL scan a principal routed worker's records for loaded instructions and tool errors. A `continue` of the same session SHALL add no second agent.

#### Scenario: a routed worker carries its opencode usage
- **WHEN** a Claude Code `/sai-3-implement` run started `sai-3-red-worker` through `opencode-dispatch.js`, continued it once, and `opencode.db` holds its session
- **THEN** the execution lists one `sai-3-red-worker` principal worker whose `usage` and `tool_calls` come from that opencode session, and the coordinator's own usage is unchanged

### Requirement: Helpers of opencode-routed workers in the Claude Code execution index

For a Claude Code execution, the collector SHALL add each child session that an opencode-routed worker started itself, found below the worker's session through `session_v2.parent_id` in `opencode.db`, to the execution's agents in the worker's segment, with its session ID as its agent ID, its `parent_agent_id` set to the session that started it, and the usage of its own session. When the worker's child sessions cannot be read, the collector SHALL add one agent with `usage: unavailable` under the worker and an `unread` entry of kind `opencode-routed-helpers` that names the cause, never zero helpers.

#### Scenario: a routed worker's helper is an agent of the execution
- **WHEN** a Claude Code `/sai-3-implement` run started `sai-3-red-worker` through `opencode-dispatch.js` and its opencode session started a `budget-explorer` child session
- **THEN** the execution lists that helper as an auxiliary agent whose `parent_agent_id` is the RED worker's session and whose usage is its own session's

### Requirement: An unreadable opencode-routed worker is unavailable and unread

When an opencode-routed worker's `sessionID` is not in the transcript, its session is not in `opencode.db`, or `opencode.db` cannot be read, the collector SHALL report its `usage` as `unavailable` and its `tool_calls` as null, never as zero, and SHALL add an `unread` entry of kind `opencode-routed-worker` that names the agent, the opencode session, and the reason.

#### Scenario: a worker whose sessionID never reached the transcript
- **WHEN** a routed `start` call's result holds no dispatch result object
- **THEN** that worker's `usage` is `unavailable` and an `unread` entry names it with `opencode_session` null and the reason `its sessionID is not in the transcript`

#### Scenario: an opencode database that cannot be opened
- **WHEN** the run dispatched an opencode-routed worker and `node:sqlite` is not available
- **THEN** the worker's `usage` is `unavailable` and its `unread` entry carries the reader's message

### Requirement: A routed worker's zero currency cost is dropped

The collector SHALL drop a currency cost of 0 recorded for an opencode-routed worker from its figures, because a recorded 0 is no price.

#### Scenario: a provider that reports no price
- **WHEN** an opencode-routed worker's requests record a cost of 0
- **THEN** its `usage` carries its token figures and no currency cost

### Requirement: opencode message content from both storage layouts

The collector SHALL read the content items of an opencode message from either storage layout. When the message's `session_message.data.content` is a non-empty array, that array SHALL be its content and its `session_part` rows SHALL NOT be read. Otherwise its content SHALL be the parsed `data` of its `session_part` rows in `ordinal` order. The collector SHALL use only the `text`, `tool`, and `reasoning` items and SHALL ignore items of any other type. The text, tool calls, tool errors, loaded instructions, and excerpts of opencode records SHALL come from these items, and `reasoning` items SHALL appear neither in `excerpt` output nor in tool counts. A part row whose `data` is not valid JSON SHALL be skipped and counted in the `unparseable-records` unread portion, and the other parts of the message SHALL still be read. `excerpt` SHALL keep addressing a record by its `session_message` ID, whichever layout holds its content.

#### Scenario: Content stored as session parts
- **WHEN** an assistant message has an empty `data.content` and `session_part` rows holding a `text` item and a `tool` item
- **THEN** the index counts that tool call and its excerpt, addressed by the message ID, shows the text and the tool call

#### Scenario: Content in data.content is not counted twice
- **WHEN** an assistant message has a non-empty `data.content` and also has `session_part` rows
- **THEN** only the `data.content` items are read, and each tool call is counted once

#### Scenario: Invalid part data
- **WHEN** one `session_part` row of a message holds data that is not valid JSON and another row of the same message holds a `text` item
- **THEN** the invalid row is counted in the `unparseable-records` unread portion and the excerpt still shows the text of the other row

#### Scenario: Reasoning and other part types
- **WHEN** a message's parts hold a `reasoning` item, a `step-start` item, and a `text` item
- **THEN** the excerpt shows only the text, and neither the reasoning nor the `step-start` item appears in the excerpt or in tool counts

### Requirement: opencode messages without readable content are listed as unread

When the opencode database has the `session_part` table, an assistant message with at least one token counter above 0 and no `text`, `tool`, or `reasoning` item in either storage layout SHALL be a message without readable content. Each session (a root session, a linked child session, an opencode-routed worker, or a helper of one) with at least one such message SHALL receive one `unread` entry of kind `messages-without-content` that names the project and the session and carries the number of such messages. The rest of the session SHALL still be analyzed and opencode SHALL stay `analyzed`. A database without the `session_part` table SHALL raise no such entry.

#### Scenario: A session with an unreadable message
- **WHEN** a session with the `session_part` table has two assistant messages with token usage, one with a `text` part and one with no content item in either layout
- **THEN** the index lists one `messages-without-content` unread entry for that session with count 1, and opencode stays `analyzed`

#### Scenario: A reasoning-only message is readable
- **WHEN** an assistant message with token usage holds only a `reasoning` part
- **THEN** no `messages-without-content` entry is raised for it

#### Scenario: Legacy database
- **WHEN** the database has no `session_part` table and an assistant message with token usage has an empty `data.content`
- **THEN** no `messages-without-content` entry is raised

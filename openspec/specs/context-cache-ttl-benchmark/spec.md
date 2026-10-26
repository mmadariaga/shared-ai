# context-cache-ttl-benchmark Specification

## Purpose
TBD - created by archiving change context-cache-ttl-benchmark-claude-code. Update Purpose after archive.

## Requirements

### Requirement: Claude Code runs are measured, not short-circuited

The benchmark SHALL measure context-cache lifetime on Claude Code in both main and subagent mode. A Claude Code dry run, inspection, or consented run SHALL NOT be answered with a fixed `unavailable` report; `unavailable` SHALL be reported only when a target or a required capability is missing.

#### Scenario: Consented Claude Code run starts a measurement

- **WHEN** a user runs the benchmark with `--tool claude`, a resolvable invoking session, and `--acknowledge-consumption`
- **THEN** the runner creates the run state in `--out` and prints the first wait step instead of an `unavailable` report

#### Scenario: Claude Code inspection verifies identity without writing files

- **WHEN** a user runs the benchmark with `--tool claude --inspect` for a resolvable target
- **THEN** the runner reads the transcripts, prints the verified identity, and writes no files

### Requirement: Inverted-control step protocol shares the engine decisions

On Claude Code the model in the session SHALL drive the run through the runner's `next`, `wait`, `record`, and `finish` commands, each taking `--out DIR`. `next` and `record` SHALL replay the recorded probes through the unchanged `engine.js` `measure()` loop, so that every engine decision (ladder, descent, refinement, rewarm, sanity check, caps, and result kind) is the one the opencode loop makes for the same sample sequence. The engine algorithm and parameters SHALL stay unchanged.

#### Scenario: Main-mode protocol matches the opencode loop

- **WHEN** a fixture sequence of Claude Code main-mode samples is recorded step by step through `next` and `record`
- **THEN** the planned waits and the final result equal those the opencode loop produces for the same sample sequence

#### Scenario: Subagent-mode protocol matches the opencode loop

- **WHEN** a fixture sequence of Claude Code subagent-mode samples is recorded step by step through `next` and `record`
- **THEN** the planned waits and the final result equal those the opencode loop produces for the same sample sequence

### Requirement: Waits are background commands whose notification is the probe

A Claude Code wait SHALL run as a background Bash command (`run_in_background: true`) executing `cache_ttl.js wait --out DIR --seconds N` with the description `cache-ttl-wait`, and SHALL end `N` seconds after the target's last transcript request once that request is stable. In main mode the reactivation caused by the wait's completion notification SHALL be the probe; in subagent mode the probe SHALL be a `SendMessage` of the step's fixed message to the captured agent id. The procedure SHALL NOT use `Monitor` or `ScheduleWakeup` for waits.

#### Scenario: Wait ends an interval after the last request

- **WHEN** a wait of `N` seconds runs while the target's last transcript request is at time `T`
- **THEN** the wait ends no earlier than `T + N` seconds

#### Scenario: Subagent probe is a SendMessage to the captured child

- **WHEN** a subagent-mode wait completes
- **THEN** the procedure sends the step's message unchanged to the step's agent and then calls `record`, which reads the probe from the child's transcript

### Requirement: Exact Claude Code target resolution

The main target SHALL be the invoking session named by `${CLAUDE_SESSION_ID}`, supplied by the Claude Code command wrapper's `Session id` line, and found as exactly one transcript `<projects>/<project>/<session_id>.jsonl`, where `<projects>` is the `projects` folder under `CLAUDE_CONFIG_DIR` (else `~/.claude`) unless `--projects DIR` overrides it. A subagent target SHALL be the transcript `<projects>/<project>/<session_id>/subagents/agent-<agentId>.jsonl` of a child of that invoking session. Zero matching transcripts, more than one, or a transcript belonging to another session or agent SHALL make the run `unavailable` with the reason, and the target SHALL never be replaced by the closest match.

#### Scenario: Missing invoking transcript is unavailable

- **WHEN** no transcript names the invoking Claude Code session
- **THEN** the run reports `unavailable` with zero probes, the reason in its limitations, and sends no request

#### Scenario: Foreign subagent transcript is rejected

- **WHEN** the requested subagent transcript belongs to another agent or another session
- **THEN** the run reports `unavailable` and does not measure any other child

### Requirement: Same-model subagent child

In subagent mode on Claude Code the procedure SHALL create the child with the `Agent` tool, `subagent_type: general-purpose`, and no model override, so that it inherits the main session's model; agents that pin their own model, such as the `budget-*` agents, SHALL NOT be used as the child. Every request's `message.model` SHALL be checked: a child on another model than the main session SHALL stop the run with a report, and the model SHALL never be switched. Because the transcript does not record the effort level, the subagent's effort SHALL be reported as an unverified limitation.

#### Scenario: Subagent on another model stops the run

- **WHEN** the child's transcript requests carry a `message.model` different from the main session's model
- **THEN** the run stops with a report naming the mismatch and does not switch either model

#### Scenario: Subagent effort is reported as unverified

- **WHEN** a Claude Code subagent-mode run reports its limitations
- **THEN** the limitations state that the subagent effort level is not verified, and a main-mode run carries no such limitation

### Requirement: Transcript-based sample measurement

Each Claude Code sample SHALL be measured from the transcript. Lines sharing `message.id` SHALL be collapsed into one request stamped with the earliest `timestamp`, and each request SHALL read `cache_read_input_tokens`, `input_tokens`, `cache_creation.ephemeral_5m_input_tokens`, `cache_creation.ephemeral_1h_input_tokens`, and `message.model`. The interval SHALL run from the request before the probe to the probe request by transcript timestamps, never the requested wait. Each sample SHALL record the cache bucket it wrote to (`ephemeral_5m`, `ephemeral_1h`, or none written), and the report SHALL list the buckets observed. Probe usage that is not yet written SHALL be answered with `pending` and read on a later `record`; usage still absent SHALL make the sample invalid, never a MISS.

#### Scenario: Late probe usage is read on the next request

- **WHEN** `record` runs before the transcript holds the probe's usage
- **THEN** it answers `pending`, and a later `record` reads the usage and records the sample

#### Scenario: Interval and bucket come from the transcript

- **WHEN** a sample is recorded
- **THEN** its interval equals the difference of the anchor and probe transcript timestamps and the sample records the probe's cache bucket

### Requirement: Interference and incomplete waits on Claude Code

A user message, another task notification, queued input, an automatic compaction, or a second continuation on the target between the start of a wait and its probe SHALL invalidate that sample; hook-added context on the probe turn SHALL be recorded as an observation and SHALL NOT invalidate it. A wait whose notification status is not `completed`, including `killed`, SHALL leave its sample incomplete, never a MISS, keep the earlier valid samples, and mark the report incomplete; for a stopped wait the report SHALL name `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` as a launch option the user may choose, and the benchmark SHALL NOT set it or change any other setting or environment variable, except the user-permitted warming override in `.sai/settings.local.jsonc` that it restores byte for byte when the run ends. `finish --out DIR` SHALL stop a run, keep its valid samples, and mark the report incomplete.

#### Scenario: Interfering request invalidates the sample

- **WHEN** a user message appears on the target between a wait's start and its probe
- **THEN** that sample is invalid and the run is reported as incomplete

#### Scenario: Killed wait leaves an incomplete sample

- **WHEN** a background wait's notification reports status `killed`
- **THEN** the sample is incomplete rather than a MISS, earlier valid samples are kept, and the report names `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1`

#### Scenario: Warming override is the only setting change

- **WHEN** the user permits the warming override and the benchmark measures
- **THEN** `.sai/settings.local.jsonc` is the only setting the benchmark changes, and it restores that file when the run ends

### Requirement: Missing Claude Code capability is reported by name

When transcript usage fields, background command notifications, or `SendMessage` continuation (subagent mode) are missing, the run SHALL report `unavailable` and name the missing capability; `finish --out DIR --unavailable <what is missing>` SHALL record that report.

#### Scenario: Missing usage fields are named

- **WHEN** the invoking session's transcript has no request with `cache_read_input_tokens` and `input_tokens`
- **THEN** the run reports `unavailable` naming the absent transcript usage fields

#### Scenario: Missing SendMessage is recorded by finish

- **WHEN** the procedure runs `finish --out DIR --unavailable` naming the missing `SendMessage` capability
- **THEN** the report has status `unavailable` and names that capability

### Requirement: Claude Code consent warning

Before the first Claude Code probe, the benchmark SHALL warn about the billable cost and the expected run time of the plan shown, SHALL state that each probe is a full model turn over the whole conversation and that the session is reserved for the whole run in both modes (typing in it invalidates the sample in flight), and SHALL obtain explicit consent.

#### Scenario: Run without consent sends no probe

- **WHEN** a Claude Code run is requested without `--acknowledge-consumption`
- **THEN** the runner refuses to start and no probe is sent

### Requirement: Claude Code command capability profile

The `context-cache-benchmark-command` capability profile SHALL grant the access the Claude Code protocol needs: the shell command `node {skills}/sai-context-cache-ttl-benchmark/cache_ttl.js *`, subagent delegation, and message continuation for `SendMessage`. The opencode behavior of the command SHALL stay unchanged.

#### Scenario: Profile grants shell, delegation and messages

- **WHEN** the install manifest is expanded for the Claude Code command
- **THEN** its capability profile includes the `cache_ttl.js` shell rule, subagent delegation, and message access

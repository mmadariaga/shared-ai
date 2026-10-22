> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Issue #226 requires `sai-context-cache-ttl-benchmark` to measure context-cache lifetime in both of its modes (the invoking main conversation and a same-model subagent) on both supported tools. The earlier implementation short-circuited every Claude Code run, including `--dry-run` and `--inspect`, to an `unavailable` report, so Claude Code could not be measured at all. No external process can send a prompt into a live Claude Code session, and resuming a session with `claude -p --resume` does not prove the same context, so the measurement must be driven from inside the live session and read from its transcripts.

## What Changes

- `cache_ttl.js` no longer short-circuits `--tool claude`. A consented Claude Code run creates a run state in `--out` and is then driven by the session through four step commands, each taking `--out DIR`: `next` (plans the next wait), `wait --seconds N` (the background wait), `record` (reads the finished probe from the transcript and returns the next wait, `pending`, or `done`), and `finish` (stops the run, optionally recording `--unavailable <what is missing>` or `--reason`). `next` and `record` replay the recorded probes through the unchanged `engine.js` `measure()` loop, so every engine decision is the one the opencode loop makes for the same sample sequence. `--inspect` reads the transcripts and prints the verified identity without writing files.
- `adapters.js` adds a Claude Code transcript reader (`ClaudeTranscripts`) and a replay adapter (`ClaudeReplayAdapter`). The reader finds the main transcript `<projects>/<project>/<session_id>.jsonl` by the exact invoking session id and the subagent transcript `<projects>/<project>/<session_id>/subagents/agent-<agentId>.jsonl`, where `<projects>` is the `projects` folder under `CLAUDE_CONFIG_DIR` (else `~/.claude`) and `--projects DIR` overrides it. It collapses lines sharing `message.id` into one request stamped with the earliest `timestamp`, reads `cache_read_input_tokens`, `input_tokens`, the `ephemeral_5m` / `ephemeral_1h` cache-creation split, and `message.model`, classifies interference between the anchor request and the probe, and records each sample's cache bucket. `claudeLimitation` is replaced by `claudeLimitations(mode)`, the standing limitations reported with every run.
- The wait ends `N` seconds after the target's last transcript request, once that request has been stable for two seconds, and its completion notification reactivates the session; a wait whose notification status is not `completed` (for example `killed`) leaves an incomplete sample.
- The Claude Code wrapper `commands/claude/sai-context-cache-ttl-benchmark.md` passes `Session id: ${CLAUDE_SESSION_ID}`, and `SKILL.md` names the same placeholder for skill loads, so the benchmark targets the invoking session by its exact id.
- `SKILL.md` gains a Claude Code procedure: waits as a background Bash command with the description `cache-ttl-wait` (never `Monitor` or `ScheduleWakeup`), the reactivation as the main-mode probe, a `SendMessage` of the step's message to the captured agent id as the subagent probe, and the cost warning that each probe is a full model turn over the whole conversation and that the session is reserved for the run. The subagent is created with the `Agent` tool, `subagent_type: general-purpose`, and no model override; the `budget-*` agents pin their own model and are not valid children.
- `sai/install-manifest.json` grants the `context-cache-benchmark-command` capability profile message access (`"message": true`) for `SendMessage` continuation.
- `measurement.md`, `docs/commands/sai-context-cache-ttl-benchmark.md`, `README.md`, and `docs/on-demand-commands.md` describe the Claude Code mechanism and its limitations and drop the statement that Claude Code reports a compatibility limitation for both modes.
- `test/context-cache-ttl-benchmark-claude.test.js` adds deterministic fixture-transcript tests for the Claude Code main and subagent modes, the decision parity with the opencode loop, edge cases E1–E8, the step command line, and the capability profile; `test/context-cache-ttl-benchmark.test.js` updates the Claude Code assertions that expected the short-circuit.

## Capabilities

### New Capabilities

- `context-cache-ttl-benchmark`: measuring context-cache lifetime on Claude Code in main and same-model subagent mode through inverted control and transcript reads, sharing the engine decisions with opencode, and reporting each run per tool and mode with its samples, limitations, and observed cache buckets.

### Modified Capabilities

- None

## Impact

New files:

- `test/context-cache-ttl-benchmark-claude.test.js`

Modified files:

- `skills/universal/sai-context-cache-ttl-benchmark/cache_ttl.js`
- `skills/universal/sai-context-cache-ttl-benchmark/adapters.js`
- `skills/universal/sai-context-cache-ttl-benchmark/SKILL.md`
- `skills/universal/sai-context-cache-ttl-benchmark/measurement.md`
- `commands/claude/sai-context-cache-ttl-benchmark.md`
- `sai/install-manifest.json`
- `docs/commands/sai-context-cache-ttl-benchmark.md`
- `docs/on-demand-commands.md`
- `README.md`
- `test/context-cache-ttl-benchmark.test.js`

`skills/universal/sai-context-cache-ttl-benchmark/engine.js` and the opencode adapter are unchanged. Known limitations left behind: the Claude Code session is reserved for the whole run and any user message invalidates the sample in flight; the subagent effort level cannot be checked from the transcript and is reported as unverified; Claude Code may stop a long background wait under memory pressure, which leaves the sample incomplete and may require repeating the run; and each Claude Code probe is a full model turn over the whole conversation, which costs more than the opencode probe.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The partial implementation is commit `abe9abb8` on branch `feat/226_sai_context_cache_ttl_benchmark` (PR #227). The original `cache-ttl` source skill is not on this machine, so the parameters in `engine.js` are the only available reference; `measurement.md` records that the descent was corrected to 60/30/15 s from the maintained program.

POC evidence (discarded worktree `C:/Projects/mine/shared-ai-poc-226`): background waits of 6 and 20 minutes reactivated the session with cache hits; a 65-minute wait was stopped by Claude Code after 26.6 minutes because the system was low on memory. Reactivation arrived 4 to 14 s after the wait ended, and a user `UserPromptSubmit` hook ran on every reactivation.

The original handoff asks for the full test suite to run before closing, and for authorization before any archive or commit operation.

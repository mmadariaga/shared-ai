---
name: sai-context-cache-ttl-benchmark
description: Measure observed context-cache lifetime with timed probes in the invoking conversation or a same-model subagent.
disable-model-invocation: true
---

# Context-cache lifetime benchmark

Run only on explicit invocation. Retain the invoking conversation and its model;
this is an experiment, not a clean-context SAI pipeline phase. Read
`measurement.md` beside this file before preparing a run. Use the co-located
`cache_ttl.js`, `engine.js`, and `adapters.js`; the original personal `cache-ttl`
installation and historical experiment notes are not dependencies.

Claude Code session id, when this file is loaded as a skill: `${CLAUDE_SESSION_ID}`.

Two tools, two ways of driving the probes. On **opencode** the runner drives
them through the session API. On **Claude Code** no external process can send a
prompt into a live session, so the model in the session drives them (inverted
control): it performs each wait, the reactivation or a `SendMessage` is the
probe, and the runner only plans the next wait and records each probe from the
session transcripts. Both tools share one decision path in `engine.js`.

## Prepare

1. Resolve the requested mode: `main` (default) or `subagent`. Check the
   tool-specific support in `measurement.md` before any session creation. For
   the tool in use, obtain the invoking session's exact identifier from native
   session metadata. On Claude Code it is the `Session id` line the command
   wrapper supplies (`${CLAUDE_SESSION_ID}`); if that line still holds the
   literal placeholder or cannot be established, explain the missing interface
   and stop this measurement. An activity-sorted session list is not identity
   evidence, and a missing or foreign target is `unavailable`, never replaced
   by the closest match.
2. For `main`, target that identifier. For `subagent`, create a native child
   conversation using the invoking conversation's exact provider, model and
   variant, then keep that child for the entire experiment. On opencode use
   native subagent dispatch with the explicit model and variant and retain its
   returned session identifier. On Claude Code use the `Agent` tool with
   `subagent_type: general-purpose` and **no model override**, so the child
   inherits the main model. The `budget-*` agents pin their own model and are
   not valid children. Give it a task that ends with a plain reply, capture its
   agent id from the result, and use that id as `--session` (the invoking
   session stays `--invoking-session`). Claude Code may ask you to approve the
   `Agent` call. A model that differs from the main model, for example through
   `CLAUDE_CODE_SUBAGENT_MODEL` or agent frontmatter, stops the run (the E2
   check at `--inspect` and start). A fork or a fresh generic session is not an
   equivalent substitute. Never fall back to the other mode.
3. On opencode, prepare the host to answer each benchmark probe exactly `OK`,
   with no tools. A subagent host needs a substantial existing conversation
   prefix (at least 2,000 cacheable tokens for the default HIT threshold).
   Seed it only with the user's consent; seeding is billable and precedes
   measurement. Resolve and verify its actual model, not a guessed label.
4. Run the co-located runner with `--inspect`, the explicit `--tool`,
   `--mode`, `--session`, `--invoking-session`, and a new `--out` directory.
   This reads identity and interference-monitor availability without sending
   a model request. Preserve user-supplied algorithm parameters. If access or
   data is missing, report that limitation; leave configuration unchanged.

## Start

Before launching, show the verified tool, mode, session, provider/model,
variant, resolved parameters, output path, and probe/duration limits. Warn:
the experiment consumes billable usage, can take hours (about 15.5 hours for
the first default ladder; state the expected run time of the plan shown),
appends probe turns, and requires **no other interactions in the target
conversation**. Main mode occupies this chat; subagent mode leaves the parent
usable on opencode but account traffic can affect eviction. On Claude Code say
also that each probe is a full model turn over the whole conversation, and that
the session is reserved for the whole run in both modes: typing in it
invalidates the sample in flight. Existing cache-warming activity invalidates
the experiment; report it rather than change settings. Obtain explicit consent
to this plan and consumption.

### opencode

Launch the co-located runner in the background with the same inspected
arguments plus `--acknowledge-consumption`. Use the harness's native background
shell execution. A harness without it reports the limitation instead of holding
an unfinished tool call in the measured conversation. End the launch turn with
the startup acknowledgment; the runner waits for that response to complete and
become quiet. During the experiment answer incoming probes exactly `OK`. Keep
every other tool call, progress message, and notification out of the target
conversation. Never edit the skill or switch models during a run.

Cancel by sending SIGINT or SIGTERM to the runner process, not the host
conversation. It stops new submissions and preserves partial results; an
already admitted request may finish. Do not resubmit a timed-out probe.

### Claude Code

`<runner>` below is `node` plus the path of the installed `cache_ttl.js`,
written exactly as in the inspection call (project-local first). Missing
`run_in_background` Bash, transcript usage fields, or `SendMessage` (subagent
mode) is a capability gap: run `<runner> finish --out DIR --unavailable "<what
is missing>"`, report it, and stop.

1. Start: `<runner> <inspected arguments> --acknowledge-consumption`. It
   creates the run state in `--out` and prints the first step as JSON.
2. For a step `{"action":"wait", "seconds": N, ...}`:
   - Run `<runner> <wait_args>` as a **background Bash command** (`run_in_background: true`) with
     the Bash `description` set to exactly `cache-ttl-wait`, which is how its
     completion notification is recognised. Never use `Monitor` or
     `ScheduleWakeup`. The command ends `N` seconds after the target's last request.
   - Then end the turn with a one-word reply and do nothing else: no other
     tool call, message or notification. Do not poll.
   - **main**: the notification that reactivates the session is the probe. In
     that turn call `<runner> <record_args>` right away, with no other tool call first.
   - **subagent**: when the notification arrives, `SendMessage` the step's
     `message` to the step's `agent` unchanged (the child's request is the
     probe), then call `<runner> <record_args>`; it waits for the child.
3. `record` answers `pending` while the transcript does not hold the sample
   yet. The transcript writes usage late, so the probe's usage is read on the
   next request: call `record` again, as the next tool call. Otherwise it
   prints the next `wait` step, or `done`. Repeat from step 2 until `done`.
4. A user message or any other request on the target during a sample
   invalidates it, and the run reports it as incomplete. If the user asks to
   stop, run `<runner> finish --out DIR`; it keeps the valid samples and marks
   the report incomplete.

A background wait that Claude Code stops (status `killed`, for example under
memory pressure) leaves its sample incomplete, never a MISS; earlier valid
samples are kept. The report then names
`CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` as a launch option the user may
choose before starting Claude Code; never set it, change any other setting or
environment variable, or switch the model.

## Close

After the runner exits (opencode) or prints `done` (Claude Code), read its
`report.json` and paste `summary.md` including the per-probe table, the
observed cache bucket and the validity limitations. Keep tool, mode, model and
variant with every comparison. Report incomplete and unavailable runs as
such; all-HIT means a lower bound, all-MISS an observed upper bound, and
contradictory observations uncertainty. A bracket is an empirical interval,
not an exact lifetime or a retention guarantee. Never combine main and
subagent observations into one estimate.

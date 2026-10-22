# Measurement reference

## Runtime support

| Tool / mode | Hosting and observation |
|---|---|
| opencode / main | Existing invoking session; explicit ID; API prompt admission and that session's per-message token usage. |
| opencode / subagent | Existing native child, verified `parentID`, same provider/model/variant as parent; same API and usage path as main. |
| Claude Code / main | The invoking session, named by `${CLAUDE_SESSION_ID}`. The model in the session performs each wait (a background Bash command) and the reactivation that its completion notification causes is the probe; usage and timestamps come from the session transcript. |
| Claude Code / subagent | A child of the invoking session created with the `Agent` tool, `subagent_type: general-purpose` and no model override, so it inherits the main model (the `budget-*` agents pin their own model and are not valid children). Each probe is a `SendMessage` to the captured agent id; usage and timestamps come from the child's own transcript. |

## Claude Code mechanism

No external process can send a prompt into a live Claude Code session, and
resuming a session through the CLI does not prove the same context. The control
is therefore inverted: the model in the session performs the waits and the
runner only plans and records. `cache_ttl.js next` replays the probes recorded
in `state.json` through the same `measure()` loop opencode uses and returns the
next wait; `cache_ttl.js record` reads the finished probe from the transcript,
appends it to the state and returns the next wait or the final report. Every
engine decision (ladder, descent, refinement, rewarm, sanity check, caps) is the
one the opencode loop makes for the same sample sequence.

- **Waits.** `cache_ttl.js wait --out DIR --seconds N` runs as a background Bash
  command (`run_in_background`, description `cache-ttl-wait`). It ends `N`
  seconds after the target's last transcript request, once that request has
  been stable for two seconds, so the interval cannot end early. Its exit
  notification reactivates the session. `Monitor` (30-minute expiry, a
  re-arming turn refreshes the cache) and `ScheduleWakeup` (only under
  `/loop`, 3,600-second cap) are not used.
- **Transcripts.** The main file is `<projects>/<project>/<session_id>.jsonl`
  and the subagent file `<projects>/<project>/<session_id>/subagents/agent-<agentId>.jsonl`,
  where `<projects>` is the `projects` folder under the Claude Code
  configuration root (`CLAUDE_CONFIG_DIR`, else `~/.claude`; `--projects` overrides
  it). The main file is found by the exact session id: no match, several
  matches, or a transcript naming another session is `unavailable`.
- **Requests.** Lines that share `message.id` are one request, stamped with the
  earliest `timestamp`. Per request the runner reads `cache_read_input_tokens`,
  `input_tokens`, `cache_creation.ephemeral_5m_input_tokens`,
  `cache_creation.ephemeral_1h_input_tokens`, and `message.model`.
- **Interval and bucket.** The interval runs from the request before the probe to
  the probe request, by transcript timestamps, never the requested wait. Each
  sample records the cache bucket the probe wrote to and the one the anchor
  wrote to (`ephemeral_5m`, `ephemeral_1h`, `none-written`); the report lists
  every bucket observed.
- **Late usage.** The transcript writes usage late: a main-mode probe is read
  on the next request (`record` answers `pending` once, and the model calls it
  again). A subagent probe is read once the child's transcript has been quiet
  for five seconds. Usage still absent then makes the sample invalid, never a
  MISS.
- **Interference.** Between the request that launched the wait (main) or the
  previous sample (subagent) and the probe, a user message, another task
  notification, queued input, an automatic compaction, or a second continuation
  invalidates the sample. Hook-added context on the probe turn is recorded as an
  observation and does not. A wait whose notification status is not
  `completed` (for example `killed` under memory pressure) leaves the sample
  incomplete, never a MISS; the report then names
  `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` as a launch option the user may
  choose, and the benchmark never sets it.
- **Model.** The model is checked through every request's `message.model`. A
  subagent on another model than the main session stops the run. The effort
  level is not in the transcript and is reported as an unverified limitation.
- **Capabilities.** Transcript usage fields, background command notifications,
  and `SendMessage` continuation are required. A missing one reports
  `unavailable` and names it; `finish --out DIR --unavailable "<what>"` records
  that. `finish --out DIR` also stops a run and keeps its valid samples.

The session is reserved for the whole run in both modes, and each probe is a
full model turn over the whole conversation. Simulated fixtures validate data
handling and the shared decision path only, never live equivalence.

Concrete mechanism validation: the opencode V2 OpenAPI contract defines
`GET /api/session/{sessionID}` with `id`, `parentID`, `model`, and `fork`;
`POST /api/session/{sessionID}/prompt` admits a user message into that existing
session and returns its ID and `sessionID`; the message-list endpoint returns
per-request model, timing, content and `tokens.cache.read`. The adapter checks
these fields and correlates admission with exactly one new assistant response.
It never creates a replacement session or changes session configuration.
API reads do not send provider requests. Use the existing authenticated
`opencode api` CLI (including its configured server), not a guessed server URL.

Sources for these checks:
- https://opencode.ai/v2/docs/api
- https://opencode.ai/v2/openapi.json
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/sessions#what-a-resumed-session-restores
- https://code.claude.com/docs/en/prompt-caching#subagents-and-the-cache

## Dependencies and invocation

Node.js 22+. opencode: the V2 CLI with access to the exact session and its
per-message usage, and a readable server interference log. Claude Code: a
readable `projects` transcript folder, Bash with `run_in_background`, the
`Agent` tool and `SendMessage` (subagent mode). No npm packages,
SQLite, OpenSpec, or historical experiment files are required. Missing
permissions, unsupported API schemas, missing usage or an unreadable log
produce a limitation rather than fabricated cache reads. The runner reads the
log but does not edit it or warming settings. Log rotation/truncation or
warming/keep-alive lines for the target invalidate affected samples.
Hidden warming that does not appear in that log remains an observational
limitation; verify effective warming settings manually before consent.

From the installed skill directory (project-local takes precedence):

```sh
node cache_ttl.js --tool opencode --mode main \
  --session ses_EXACT --invoking-session ses_EXACT \
  --out /tmp/opencode/cache-benchmark-UNIQUE --inspect
```

For subagent mode use its child ID as `--session` and keep the parent ID in
`--invoking-session`. The original `--subagent` flag remains an alias for
`--mode subagent`. For a live run replace `--inspect` with
`--acknowledge-consumption` only after the skill's warning and consent.
Use a private new directory with an existing parent, chosen for the platform;
the runner refuses to overwrite an existing run. A CLI-only `--dry-run`
prints the schedule without API calls, files, sleeps or paid requests; it
does not verify session identity.

For Claude Code use `--tool claude`, the invoking session's id for
`--invoking-session` (and for `--session` in main mode), the child's agent id for
`--session` in subagent mode, and optionally `--projects DIR`. `--inspect`
reads the transcripts and prints the verified identity without writing files.
A consented run (`--acknowledge-consumption`) creates `--out`, writes
`state.json`, and prints the first step; the session then drives the run with
`next`, `wait`, `record` and `finish`, each taking `--out DIR`:

```sh
node cache_ttl.js next   --out DIR
node cache_ttl.js wait   --out DIR --seconds N     # background Bash, description cache-ttl-wait
node cache_ttl.js record --out DIR [--poll-s 120]  # subagent: waits for the child
node cache_ttl.js finish --out DIR [--reason TEXT | --unavailable TEXT]
```

Each prints one JSON object: `wait` (seconds, `wait_args`, `record_args`),
`pending` (call `record` again), or `done` (report and summary paths). On Claude
Code `--probe-text` is the `SendMessage` text in subagent mode, and
`--time-prefix` and `--log` are not used: a main-mode probe is the reactivation.

## Parameters (maintained source defaults)

| Parameter | Default | Meaning |
|---|---|---|
| `--base` / `--step` | 4 / 5 minutes | Increasing intervals; last rung clamped to cap and actually probed. |
| `--cap` | 90 minutes | Maximum ladder interval, not total runtime. |
| `--gran` | 30 seconds | Refine until bracket width is at most twice this. |
| `--warm` | 3 seconds | Short rewarm before each refinement; requires a HIT. |
| `--repeats` | 3 | Whole-protocol repetitions; later starts one step below previous last HIT, floor base. |
| `--hit-min` / `--miss-max` | 2000 / 500 tokens | HIT / MISS thresholds; intermediate usage gets one ladder retry. |
| `--max-probes` | 30 × repeats | Counts every actual request, including rewarms and sanity retries. |
| `--max-runtime-min` | max(55, ceil(1.5 × ladder minutes)) × repeats | Total run limit, including waits and result collection. |
| `--consistent-threshold-s` | max(2 × gran, 60) | Allowed spread of repetition bracket midpoints. |
| `--probe-text` | Respond exactly: OK. Do not use any tools. Say nothing else. | Probe instruction. |
| `--time-prefix` | true | Add UTC clock and actual idle time to the new suffix. Accepts true/false. |
| `--log` | XDG data home or ~/.local/share, then opencode/log/opencode.log | Interference evidence; readable, append-only during a run. |

If the first probe misses, descend through 60, 30, 15 seconds, omitting any
interval not below that MISS. These are the maintained program's actual
values, rather than the old prose's 2/1/0.5-minute description. Refine a
HIT/MISS bracket by rounded midpoint, rewarming before each probe. After the
last MISS, test 30 seconds and retry once on MISS to flag suspected eviction.
No request is sent while sleeping. Each completed probe resets the next gap's
anchor. Actual intervals use request creation minus the prior response's
completion, not sleep duration or CLI return time.

## Reports and validity

`results.jsonl` preserves each finished sample as it arrives; `report.json`
holds identity, parameters, actual intervals, repetitions, midpoint spread,
observed bounds, limitations and completion status; `summary.md` is the
readable comparison and sample table. Output files are private and each run
has its own directory. A forced kill cannot finalize a report, but existing
JSONL samples remain. Graceful cancellation and duration/probe limits produce
an incomplete report and stop new submissions.

Unexpected interactions, compaction, model/variant changes, multiple provider
responses, tool use, non-OK answers, missing timing/usage, or warming invalidate
the affected sample and stop new probes. Earlier valid samples remain available
as partial evidence. Contradictory actual bounds (HIT at least as long as a
MISS) never yield an exact lifetime. No HIT means only the minimum observed
MISS bound; no MISS means only cache reuse beyond the largest actual HIT gap.
Partial cache reads and inconclusive sanity checks remain explicit.

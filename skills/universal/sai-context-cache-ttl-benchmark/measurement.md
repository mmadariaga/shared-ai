# Measurement reference

## Runtime support

| Tool / mode | Hosting and observation |
|---|---|
| opencode / main | Existing invoking session; explicit ID; API prompt admission and that session's per-message token usage. |
| opencode / subagent | Existing native child, verified `parentID`, same provider/model/variant as parent; same API and usage path as main. |
| Claude Code / main | Unavailable in this runner: no validated timed-input interface to the current native conversation with correlated per-request usage. |
| Claude Code / subagent | Unavailable in this runner: no validated timed-input interface retaining the native subagent request category. |

The Claude Code adapter fails closed before making requests. Its per-request
usage decoder understands transcript `message.usage.cache_read_input_tokens`
and `input_tokens`, but decoding usage does not prove equivalent hosting.
Neither a new Agent SDK conversation nor `claude -p --resume` is used as a
substitute. This is a known compatibility limitation, not a zero-cache result.
The four tool/mode pairs remain distinct in reports and offline tests.

Concrete mechanism validation: the opencode V2 OpenAPI contract defines
`GET /api/session/{sessionID}` with `id`, `parentID`, `model`, and `fork`;
`POST /api/session/{sessionID}/prompt` admits a user message into that existing
session and returns its ID and `sessionID`; the message-list endpoint returns
per-request model, timing, content and `tokens.cache.read`. The adapter checks
these fields and correlates admission with exactly one new assistant response.
It never creates a replacement session or changes session configuration.
API reads do not send provider requests. Use the existing authenticated
`opencode api` CLI (including its configured server), not a guessed server URL.

Claude Code's documented resume restores conversation state, but its
non-interactive permission/configuration behavior and main/subagent cache
categories differ. Its prompt-cache documentation explicitly distinguishes
main conversation, subagent, and fork requests. These contracts do not expose
proof that an external `-p` resume of a subagent preserves the native category,
or a timed input path into the active invoking conversation. Therefore this
distribution does not claim a live Claude Code measurement. Simulated fixtures
validate data handling only, never live equivalence.

Sources for these checks:
- https://opencode.ai/v2/docs/api
- https://opencode.ai/v2/openapi.json
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/sessions#what-a-resumed-session-restores
- https://code.claude.com/docs/en/prompt-caching#subagents-and-the-cache

## Dependencies and invocation

Node.js 22+, opencode V2 CLI with access to the exact session and its
per-message usage, and a readable server interference log. No npm packages,
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
does not verify session identity. For Claude Code `--tool claude` preserves
the requested mode and emits a no-probe compatibility report on a consented
run. `--inspect` instead reports the limitation without writing files.

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

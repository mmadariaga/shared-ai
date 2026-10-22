# /sai-context-cache-ttl-benchmark

Explicitly measure observed context-cache reuse, preserving the invoking
conversation and model. Available as a same-named command and skill in Claude
Code and opencode. This is independent of the OpenSpec pipeline and does not
start in isolation mode.

```text
/sai-context-cache-ttl-benchmark --mode main --repeats 1 --cap 20
/sai-context-cache-ttl-benchmark --mode subagent --max-runtime-min 60
```

**Main mode** measures the invoking conversation; it must remain free of other
interactions. **Subagent mode** measures a native auxiliary conversation with
the exact same provider, model and variant; on opencode the main conversation stays usable, while on Claude Code it is reserved for the run.
A separate generic session cannot stand in for either category.

## Compatibility

opencode V2 requires Node.js 22+, authenticated `opencode api`, access to the
exact session and its per-request cache usage, native same-model subagent
dispatch for subagent mode, and a readable server interference log. The runner
drives the probes. No SQLite, npm installation, OpenSpec setup, or original
personal skill is needed.

Claude Code measures both modes from inside the live session, because no
external process can send a prompt into it and resuming a session with
`claude -p --resume` does not prove the same context. The model performs each
wait as a background Bash command, and the reactivation that its completion
notification causes (main) or a `SendMessage` continuation (subagent) is the
probe. The runner only plans the next wait and records each probe from the
session transcripts, using the same engine and decisions as opencode. It needs
Bash with `run_in_background`, the `Agent` tool, `SendMessage`, and the
transcript usage fields; a missing capability stops that measurement with an
`unavailable` report that names it.

Claude Code limitations, reported with every run:

- The session is reserved for the whole run: any message you type invalidates
  the sample in flight, in both modes.
- Each probe is a full model turn over the whole conversation, which costs
  more than the opencode probe.
- The subagent's effort level is not in the transcript, so only its model is
  verified. A subagent on another model than the main session stops the run;
  the model is never switched.
- Claude Code may stop a long background wait (for example under memory
  pressure). Such a sample is incomplete, never a MISS, earlier samples are
  kept, and the report names `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` as a
  launch option you may choose. The benchmark never sets it.
- Each sample records the cache bucket it wrote to (`ephemeral_5m` or
  `ephemeral_1h`), and the report lists the buckets observed.

Missing identity, variant control, permissions or usage on either tool stops
only that measurement with a clear explanation.

## Cost, parameters and operation

The skill shows the exact session/model, plan and limits, warns about cost and
silence, and asks for consent before launching. Each probe consumes billable
model usage and appends history. Existing warming settings are never changed;
warming, compaction, model changes or additional interactions invalidate
affected samples. Account-wide activity can also cause cache eviction.

Defaults preserve the imported experiment: base 4 minutes, step 5 minutes,
cap 90 minutes, refinement granularity 30 seconds, rewarm 3 seconds, repeats 3,
HIT threshold 2,000 cached tokens and MISS threshold 500. Later repetitions
start one step below the previous last HIT. Descend through 60/30/15 seconds
after an initial MISS; rewarm before refinement, then check 30-second sanity.
The actual cap interval is always probed if limits allow it.

`--base`, `--step`, `--cap`, and `--max-runtime-min` use minutes;
`--gran`, `--warm`, and `--consistent-threshold-s` use seconds. Also supports
`--repeats`, `--hit-min`, `--miss-max`, `--max-probes`, `--probe-text`,
`--time-prefix true|false`, and `--log`. Default probe budget is 30 × repeats,
counting rewarms and retries; default total duration scales to 1.5 × ladder
time per repetition (minimum 55 minutes per repetition). The first full
default ladder alone takes about 15.5 hours. Use explicit limits for a shorter
experiment, which may produce only partial evidence.

The installed skill's [measurement reference](../../skills/universal/sai-context-cache-ttl-benchmark/measurement.md)
contains the executable invocation, preflight and mechanism-validation notes.
`--dry-run` plans offline; `--inspect` checks identity without paid probes.
On opencode the agent launches the runner using native background shell
execution, then the host answers timed probes exactly `OK`, with no tool calls.
On Claude Code the agent steps through `next`, `wait` and `record` of the same
runner. A missing background interface is a compatibility limitation, not an
invitation to use an unfinished tool call as the measured conversation.

## Results and cancellation

Each invocation owns a new private output directory with detailed
`results.jsonl`, `report.json`, and readable `summary.md`. Reports retain tool,
mode, exact model/variant, target and actual intervals, per-sample validity,
repetition bounds, midpoint spread and limitations. The skill presents the
summary table unchanged. Do not merge categories in a comparison.

All-HIT observations establish only a lower bound; all-MISS observations only
an observed upper bound. Contradictory results do not establish a precise
lifetime. Even a consistent bracket is not a provider retention guarantee.

Cancel the opencode runner with SIGINT or SIGTERM, or a Claude Code run with
`finish --out DIR`: new submissions stop, an already admitted request may
finish, and the partial report is marked incomplete.
Probe/duration limits behave the same way. A forced kill may leave only the
already-written JSONL samples. No timed-out probe is automatically resubmitted.

Automated tests use simulated time and prepared responses only; they never
launch a billable measurement.

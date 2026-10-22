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
the exact same provider, model and variant; the main conversation stays usable.
A separate generic session cannot stand in for either category.

## Compatibility

opencode V2 requires Node.js 22+, authenticated `opencode api`, access to the
exact session and its per-request cache usage, native same-model subagent
dispatch for subagent mode, and a readable server interference log. No SQLite,
npm installation, OpenSpec setup, or original personal skill is needed.

Claude Code installs the entry point and resources, but both modes currently
report an explicit compatibility limitation **without sending probes**. The
documented `claude -p --resume` path does not establish equivalence to the
active main or native subagent cache category. This implementation does not
substitute a new headless conversation or claim simulated data as a live
measurement. Missing identity, variant control, permissions or usage on either
tool likewise stops only that measurement with a clear explanation.

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
The agent launches the runner using native background shell execution, then
the host answers timed probes exactly `OK`, with no tool calls. A missing
background interface is a compatibility limitation, not an invitation to use
an unfinished tool call as the measured conversation.

## Results and cancellation

Each invocation owns a new private output directory with detailed
`results.jsonl`, `report.json`, and readable `summary.md`. Reports retain tool,
mode, exact model/variant, target and actual intervals, per-sample validity,
repetition bounds, midpoint spread and limitations. The skill presents the
summary table unchanged. Do not merge categories in a comparison.

All-HIT observations establish only a lower bound; all-MISS observations only
an observed upper bound. Contradictory results do not establish a precise
lifetime. Even a consistent bracket is not a provider retention guarantee.

Cancel the runner with SIGINT or SIGTERM: new submissions stop, an already
admitted request may finish, and the partial report is marked incomplete.
Probe/duration limits behave the same way. A forced kill may leave only the
already-written JSONL samples. No timed-out probe is automatically resubmitted.

Automated tests use simulated time and prepared responses only; they never
launch a billable measurement.

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

## Prepare

1. Resolve the requested mode: `main` (default) or `subagent`. Check the
   tool-specific support in `measurement.md` before any session creation.
   Claude Code currently reports a compatibility limitation for both modes:
   explain it without creating a child or launching a paid probe. The
   documented resume mechanism alone does not validate a category-preserving
   experiment. For a supported tool, obtain the invoking session's exact
   identifier from native session metadata. If it
   cannot be established, explain the missing interface and stop this
   measurement. An activity-sorted session list is not identity evidence.
2. For `main`, target that identifier. For `subagent`, create a native child
   conversation using the invoking conversation's exact provider, model and
   variant, then keep that child for the entire experiment. On opencode use
   native subagent dispatch with the explicit model and variant and retain its
   returned session identifier. On Claude Code use the native Agent mechanism
   only if it can preserve that identity and category; otherwise report the
   limitation. An unpinned budget agent, a fork or a fresh generic session
   is not an equivalent substitute. A native task subagent is permitted only
   with an explicit same-model override that the tool supports, verified
   afterward by session metadata. Never fall back to the other mode.
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
the first default ladder), appends probe turns, and requires **no other
interactions in the target conversation**. Main mode occupies this chat;
subagent mode leaves the parent usable but account traffic can affect eviction.
Existing cache-warming activity invalidates the experiment; report it rather
than change settings. Obtain explicit consent to this plan and consumption.

Launch the co-located runner in the background with the same inspected
arguments plus `--acknowledge-consumption`. Use the harness's native background
shell execution on Claude Code or opencode when available. A harness without
it reports the limitation instead of holding an unfinished tool call in the
measured conversation. End the launch turn with the startup acknowledgment;
the runner waits for that response to complete and become quiet. During the
experiment answer incoming probes exactly `OK`. Keep every other tool call,
progress message, and notification out of the target conversation. Never edit
the skill or switch models during a run.

Cancel by sending SIGINT or SIGTERM to the runner process, not the host
conversation. It stops new submissions and preserves partial results; an
already admitted request may finish. Do not resubmit a timed-out probe.

## Close

After the runner exits, read its `report.json` and paste `summary.md` including
the per-probe table and validity limitations. Keep tool, mode, model and
variant with every comparison. Report incomplete and unavailable runs as
such; all-HIT means a lower bound, all-MISS an observed upper bound, and
contradictory observations uncertainty. A bracket is an empirical interval,
not an exact lifetime or a retention guarantee. Never combine main and
subagent observations into one estimate.

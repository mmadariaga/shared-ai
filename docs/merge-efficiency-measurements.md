# Merge efficiency: evidence and comparison

## What is measured

The implementation reduces model-facing mechanical collection calls and
initial instruction disclosure. It does not change models, reasoning effort,
approval, semantic resolution, independent review, finalization ownership, or
the three-round correction budgets. Both Claude Code and opencode use the
same shared engine and their existing worker bindings.

The reported approximately 22-minute single-conflict run, approximately
11 seconds of worker tools, and approximately 11 seconds of tests are useful
motivation, not a controlled baseline. Time outside tool execution does not
identify reasoning, generation, or provider latency. No sub-five-minute
threshold or end-to-end speedup is claimed here.

## Reproducible mechanical comparison

Run from the repository root:

```sh
node --test test/merge-efficiency-tool.test.js
```

The `same-clean-preflight` diagnostic compares the previous five mechanical
commands and the engine's single `preflight` call against the **same unchanged
temporary Git repository**. It asserts equal current branch, empty dirty set,
and selected candidate. No model, human wait, test command, or correction is
involved in that case. The engine adds explicit state-validity collection;
its internal Git subprocesses are not hidden in the timing. Boundary calls
mean model-facing tool calls, not internal subprocesses.

Observed sample on Linux, Node `v26.10.0`, with baseline source at
`05d5d9e5e89290d0d001be0c7fe718729d7abb90`:

| Same preflight case | Before | After |
| --- | ---: | ---: |
| Mechanical tool execution | 7.16 ms | 57.81 ms |
| Model-facing collection calls | 5 | 1 |
| Initially disclosed task-library bytes | 30,208 | 9,474 |
| Worker contract plus initial task-library bytes | 34,316 | 14,737 |
| Human waiting / test execution / corrections | 0 / 0 / 0 | 0 / 0 / 0 |

The initial worker/task disclosure is approximately **57% smaller**, and
collection crosses four fewer model/tool boundaries. The deterministic
engine is approximately 51 ms **slower** in this small fixture because it
collects verifiable state and checks for races. These measurements demonstrate
instruction-volume and boundary-count improvements, not a wall-clock model
speedup. Instruction bytes are measured source volume, not billed tokens.
The test retains the measured before-volume in
`test/fixtures/merge-efficiency-baseline.json`, with its exact source revision,
path and SHA-256. It reads no moving `HEAD` and needs no historical Git objects,
so committing this change or using a shallow checkout does not change the
before-side volume. Changing the baseline requires an explicit new measurement
and provenance update; the diagnostic identifies the retained baseline.

Ordinary active-stage disclosure sizes in the measured implementation:

| Stage | Bytes |
| --- | ---: |
| preflight (includes common evidence rules once) | 9,474 |
| detect | 2,012 |
| strategy | 8,513 |
| apply | 2,912 |
| verify | 2,520 |
| collision | 7,825 |
| final | 2,423 |

Each stage is disclosed only when reached. A replacement uses `--reconstruct`
to include the common rules; the same persistent worker retains previously
loaded context. Cumulative volume is a separate metric from initial/current
disclosure; splitting does not erase prior context or promise a lower total
for a run that reaches every branch.

## Correctness evidence

The executable fixture checks conflict resolution against the pre-write
working file, retaining automatic combinations from both branches. It rejects
whole-stage checkouts that would lose those combinations, out-of-region writes,
unrelated writes, changed index/HEAD/operation state, malformed original
envelopes, incomplete inventories, and changed external snapshots. It also
checks safe stage materialization, post-staging correction boundaries, diff3/
CRLF marker parsing, linked-worktree guards, unavailable/failed/passed tests,
family-aware collision frontiers, active-only instruction disclosure, and both
harness projections. The existing merge semantic, approval, presentation and
collision tests remain in the comparison suite.

The full-suite baseline had 2,025 tests (2,021 passed, four skipped, zero
failed), with the runner reporting 10,718 ms. The added regression tests make
the after-suite larger: the first after-run reported 2,042 tests (2,038 passed,
four skipped, zero failed), at 10,661 ms. Whole-suite elapsed time is an infrastructure check,
not an equivalent-case merge latency comparison.

## Full-runtime comparison protocol

Runtime dispatch and complete merge latency still require paired traces on
each harness; installer/static tests alone do not establish runtime access.
This is a measurement procedure for Claude Code and opencode, not extra
instructions automatically loaded by `/sai-merge`.

1. Keep a frozen baseline installation and the candidate installation in
   separate test environments. Use identical repository commits, conflict
   content, branch/ref state, dirty/unrelated content, cache conditions, model
   identifiers, coordinator/worker effort or variant, provider, permissions,
   and hardware. Capture the exact versions and tunables. Do not retune them.
2. Pair cases: clean merge; one semantic conflict with Git-combined content;
   normal-mode revision; fast-track strategy; rebase with successive stops;
   failed tests followed by correction; no suite; no introduced records;
   record collision/ambiguous reference; replacement at an active stage;
   partial Git failure. Use controlled test repositories, never live branches.
3. Use the harness's recorded dispatch/tool events or an external observer.
   Collect run start/close, every human-wait interval, test intervals,
   non-test tool intervals, model-facing call counts, dispatched/disclosed
   instruction bytes (and actual tokens when the harness exposes them),
   strategy revisions, review/verification corrections and final state.
   Workers do not author clocks or add time fields to lifecycle payloads.
4. Record each raw trace at an exact reference and checksum. Emit a row with:
   `case`, `harness`, `revision`, `configuration`, `wall_ms`,
   `human_wait_ms`, `automatic_ms`, `test_ms`, `non_test_tool_ms`,
   `outside_tool_ms`, `tool_calls`, `instruction_bytes`, `corrections`,
   `correct_resolution`, `preserved_guarantees`, `trace_ref`.
   Automatic time excludes human waiting. For overlapping intervals use their
   union; outside-tool time is automatic time minus the union of all tool/test
   intervals, not the sum of potentially concurrent durations.
5. Verify the resolved behavior, unchanged protected content, complete
   approvals/presentations, independent review, exact verification outcome and
   budgets, unrelated-change protection, coordinator-only Git mutations, HEAD
   checks, collision/escalation handling and self-sufficient closure. Missing
   reconstruction must stop before writes or finalization in both harnesses.
6. Repeat paired cases with alternating order and report medians plus spread,
   not only the fastest run. Report regressions and unknown measurements.
   Compare automatic time separately from tests and human waiting. A latency
   improvement is established only by these equivalent runtime observations;
   neither the recorded 22-minute run nor the mechanical microbenchmark can
   substitute for them.

Completion criterion: each compared case has complete paired measurements,
unchanged configuration, exact trace references, correct resolution and
preserved guarantees. Runtime observations not yet collected remain explicitly
unmeasured; no explanation attributes the residual time to the model alone.

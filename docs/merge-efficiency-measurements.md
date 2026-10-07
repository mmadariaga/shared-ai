# Merge efficiency: evidence and comparison

## What is measured

Two changes are measured here. The first moved mechanical collection into one
deterministic engine and disclosed the worker's instructions per stage. The
second moved the mechanical stages themselves from the worker to the
coordinator: the coordinator calls the engine directly, and the worker is
dispatched only at the first judgment point (a conflict, or decision records
in collision).

Neither change alters models, reasoning effort, approval, semantic
resolution, independent review, finalization ownership, or the three-round
correction budgets. Both Claude Code and opencode use the same shared engine
and their existing worker bindings.

Models are configured per role by the user, so speed and price vary by
project and provider. The comparable figures are **model turns, tool calls,
and tokens per run**. Minutes are context only.

## Same scenario, before and after the role split

Scenario: one opencode run of `/sai-merge`, a rebase onto `origin/main`, one
conflict stop, four conflicted files (three OpenSpec documents, one C# file),
no decision-record collision.

The **before** column is one observed run. The provider was unusually slow
that day: the run took 132 min 51 s in total, 110 min 43 s of it in the
worker. The **after** column is derived from the contract for the same
scenario; it is not an observed run. No after-run has been traced yet, so the
after token counts are unmeasured.

| Metric | Before (observed) | After (contract-derived) |
| --- | ---: | ---: |
| Worker stretches (model sessions resumed) | 8: startup, preflight, detection, strategy, apply, verification, collision, closure | 3: startup, strategy, apply |
| Worker stretches that only relayed tool output | 5 | 0 |
| Merge-tool calls by the coordinator | not separated | 8: `enter preflight`, `provenance`, `enter conflicts`, `resolution` ×2, `enter verify`, `enter collision`, `enter final` |
| Coordinator shell calls, all kinds | 40 | unmeasured |
| Coordinator tokens (input / cache read / output) | 246,779 / 7,162,891 / 48,341 | unmeasured |
| Worker tokens (input / cache read / output) | 3,233,311 / 1,731,712 / 26,450 | unmeasured |

The eight merge-tool calls are the floor the contract defines for this
scenario. The coordinator also runs its Git operations (fetch, launch,
checkouts, staging, `git rebase --continue`), the no-commit guard around each
worker stretch, and the validation of each worker result; those are not
merge-tool calls and are part of the unmeasured total.

A failed test round adds two worker stretches (`test-correction`, then
`apply`). A decision-record collision that needs judgment adds one
(`renumbering-plan`). A clean merge or rebase with no such collision
dispatches no worker, where the previous contract resumed it for startup,
preflight, the collision pass, and closure.

The coordinator does more work than before, so its token count is expected to
rise while the worker's falls. Whether the run total falls is an open
question until a paired run is traced with the protocol below. To keep the
moved work from relocating the cost, the coordinator no longer loads its
whole instruction set at start:

| Coordinator merge instructions | Before | After |
| --- | ---: | ---: |
| Loaded at start (bytes) | 54,423 | 26,736 |
| `preflight` stage, on entry | — | 18,344 |
| `conflicts` stage, on entry | — | 10,544 |
| `verify` stage, on entry | — | 2,602 |
| `collision` stage, on entry | — | 2,646 |
| `final` stage, on entry | — | 5,476 |

Before, the start load was `coordinator.md`, `presentation.md`,
`lifecycle.md`, and `mechanics.md`. After, it is `coordinator.md`,
`lifecycle.md`, and `mechanics.md`; the rest arrives with the stage that
uses it. Shared policies fetched by both versions are excluded. Bytes are
source volume, not billed tokens. A run that reaches every stage loads about
66,000 bytes of coordinator instructions in total, more than before: the
saving is in the stages a run does not reach and in the worker sessions it
no longer resumes.

## Reproducible mechanical comparison

An earlier reported run of approximately 22 minutes with one conflict,
approximately 11 seconds of worker tools, and approximately 11 seconds of
tests is useful motivation, not a controlled baseline. Time outside tool
execution does not identify reasoning, generation, or provider latency. No
sub-five-minute threshold or end-to-end speedup is claimed here.

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

That sample predates the role split. At that time the initial worker/task
disclosure was approximately **57% smaller**, and collection crossed four
fewer model/tool boundaries. The deterministic
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

Since the role split, the preflight call is the coordinator's, and the
diagnostic's `after_instruction_bytes` is the worker's first disclosure: its
`strategy` stage in the `--reconstruct` form.

Worker stage disclosure sizes in the current implementation:

| Stage | Bytes | With `--reconstruct` |
| --- | ---: | ---: |
| strategy | 11,523 | 14,033 |
| apply | 2,912 | 7,996 |
| test-correction | 1,738 | 6,822 |
| renumbering-plan | 9,489 | 11,999 |

Each stage is disclosed only when reached. The first task of a worker and of
a replacement uses `--reconstruct`, which adds the common evidence rules, the
side mapping, and the provenance definition; the same persistent worker
retains previously loaded context afterwards. Cumulative volume is a separate
metric from initial/current disclosure; splitting does not erase prior context
or promise a lower total for a run that reaches every branch.

## Correctness evidence

The executable fixture checks conflict resolution against the pre-write
working file, retaining automatic combinations from both branches. It rejects
whole-stage checkouts that would lose those combinations, out-of-region writes,
unrelated writes, changed index/HEAD/operation state, malformed original
envelopes, incomplete inventories, and changed external snapshots. It also
checks safe stage materialization, post-staging correction boundaries, diff3/
CRLF marker parsing, linked-worktree guards, unavailable/failed/passed tests,
family-aware collision frontiers, active-only instruction disclosure for both
roles, composite stage entry, a clean route that needs no worker stage, and
both harness projections. The existing merge semantic, approval, presentation and
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
   non-test tool intervals, model turns and worker stretches per role,
   model-facing call counts, dispatched/disclosed
   instruction bytes (and actual tokens when the harness exposes them),
   strategy revisions, review/verification corrections and final state.
   Workers do not author clocks or add time fields to lifecycle payloads.
4. Record each raw trace at an exact reference and checksum. Emit a row with:
   `case`, `harness`, `revision`, `configuration`, `wall_ms`,
   `human_wait_ms`, `automatic_ms`, `test_ms`, `non_test_tool_ms`,
   `outside_tool_ms`, `model_turns`, `worker_stretches`, `tool_calls`,
   `tokens`, `instruction_bytes`, `corrections`,
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

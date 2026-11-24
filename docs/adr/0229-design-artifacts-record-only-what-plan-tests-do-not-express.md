# ADR 0229: Design artifacts record only what the plan tests do not express

## Status

Accepted. It amends ADR 0227a: decision 3 (the earlier-format stop of `/sai-3-implement` now also covers a plan that still carries `## Required Documentation`, `**What Will Be Done**`, `**Existing Tests Broken**`, or `**Files Affected**` on a step with tests) and decision 4 (the File Manifest folds only the steps without tests).

## Context

Since `/sai-2-design` runs the plan RED (ADR 0227a), `design.md` and `tasks.md` still restated facts that the code of the plan RED already writes: Target State bodies, the "What Will Be Done" prose of each step, a `## Required Documentation` section, and per-step test prose. That restatement costs design tokens and time and lets an artifact contradict the code. `/sai-3-implement` and `/sai-build` still have to get everything they need.

The test facts of a step (its tests, its test command, and whether a test is a regression guard) are known only after the plan RED has written the tests. A model that copied them into `tasks.md` by hand would bring the contradiction risk back. The plan RED also had no bound on the existing tests it could edit, so only review would catch test gaming, and `/sai-3-implement` paid with a fix RED for each scenario that had no test.

## Decision

1. **`design.md` keeps only what code cannot express.** Target State carries the public signatures as `path :: signature` entries with no function bodies (the path is the file where the plan RED writes the stub), then Decisions with their `**Record family**`, and Risks. The File Manifest folds only the steps that carry `**Files Affected**`, which are the steps without tests; when every step has tests, `file-manifest.js fold` writes the sentinel `None — every file passes through the plan RED`, never `None — no files affected`.
2. **`tasks.md` has two kinds of step.** A step with tests carries its title, its routing line, and `**Scenarios**` (the spec scenarios it covers). A step without tests carries its title, routing line, `**Files Affected**` with `A/M/D/R` tokens, `**What Changes**`, and its `**Closure criterion**`; `**Files Affected**` stays there because `check-cited-paths.js` checks only designated sections, so it keeps the invented-path check where the path is the content of the change. `## Required Documentation` and `**Existing Tests Broken**` retire; `## Implementation Context` and its `**Test Command**` stay. A step that changes tested code and untested files is split.
3. **The plan RED reports the test facts and a tool writes them.** The `completed` report of `sai-2-red-worker` carries `plan_tests` (per step: its tests as path and name, its test command, and the regression-guard flag) and `modified_tests` (each existing test it modified, with its path and reason), validated by `worker-report-validator.js`. `file-manifest.js writeback --input-file <report>` writes `**Tests**`, `**Test Command**`, and the `[regression guard]` marks into each step with tests, idempotently, and `--guard` adds a mark the coordinator accepted for a test that already passes; only the write-back writes that mark. The `/sai-3-implement` start gate (every step carries `**Tests**` or `**Closure criterion**`) is unchanged.
4. **The plan RED is bounded and scenario-titled.** It writes stubs only at the `path :: signature` paths and may modify an existing test only when that test uses a symbol whose signature `design.md` changes or removes, or asserts a scenario the specs MODIFY or REMOVE, reporting each with its reason; the design coordinator returns an out-of-bound edit to the RED. It names each test with its scenario's literal title, and the design coordinator runs `scenario-coverage.js change` after the RED and returns a `missing` or `ambiguous` answer to it (a `skip_specs` change answers `n/a`).
5. **`/sai-3-implement` stops on the earlier format.** At Start it runs `file-manifest.js format`, and an `earlier` answer (a `## Required Documentation` section, `**What Will Be Done**`, `**Existing Tests Broken**`, or `**Files Affected**` on a step with tests) ends the run before any worker exists and asks to run `/sai-2-design` again, which rewrites both artifacts in the current format. The GREEN brief carries no `## Required Documentation` entries; the production paths GREEN may write come from the `path :: signature` entries and the `**Files Affected**` of steps without tests, and GREEN never receives a test path.
6. **Unchanged.** The fix RED and the review and audit finding flow, the routes that produce no `tasks.md`, `proposal.md` and the spec format, and archived changes and changes in flight (which are not migrated). Claude Code and opencode follow the same contracts.

## Alternatives Considered

- **`/sai-3-implement` derives the tests from the code or the report** — rejected: its start gate changes and the plan loses the explicit step-to-test map.
- **The design coordinator copies the report into `tasks.md` by hand** — rejected: a model copying data brings back the contradiction risk.
- **Keep `**Existing Tests Broken**`** — rejected: design keeps researching broken tests. **No prior bound on the plan RED's edits** — rejected: only review would catch test gaming.
- **Scenario coverage replaces `**Tests**`** — rejected: the implement format gate requires `**Tests**`.
- **Remove the File Manifest** — rejected: it contradicts ADR 0227a decision 4. **Add the plan RED's stub paths to it** — rejected: the plan pull request already shows them.
- **Accept both formats, or migrate an earlier `tasks.md` automatically** — rejected: the change keeps one format and asks to run `/sai-2-design` again, as ADR 0227a did for `interfaces.md`.

## Consequences

- Changes in flight that were planned in the earlier format must run `/sai-2-design` again before `/sai-3-implement` or `/sai-build`.
- The File Manifest no longer lists the production files of steps with tests; the plan pull request and the `path :: signature` entries show them.
- The bound on existing-test edits may not cover a test broken by a behavior that neither a changed signature nor a modified scenario names; such a test surfaces at implement time.
- A scenario with no test is found in design, where the plan RED fixes it, instead of in `/sai-3-implement` through a fix RED.
- Public signatures are a design decision fixed by `design.md`, not by the RED.

## Provenance

Change `slim-design-artifacts-after-plan-red`, decision "Design artifacts record only what the plan tests do not express".

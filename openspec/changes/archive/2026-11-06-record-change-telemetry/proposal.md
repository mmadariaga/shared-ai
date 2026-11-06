> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The cost and review quality of a change across the SAI commands that worked on it were not visible next to the change. `sai/tools/retrospective.js` already read per-agent usage from `opencode.db` but only printed an aggregate to stdout, and the review findings of `/sai-plan` rounds lived only in temporary run directories that are removed when the run closes.

## What Changes

- New tool `sai/tools/change-telemetry.js` with one sub-command, `collect --harness --command --change --cwd --status [--run-dir]`. It reads `opencode.db` read-only (V2 tables `session_v2` and `session_message`) through the shared reader in `sai/tools/opencode-db.js`, finds the latest execution of `/sai-plan` or `/sai-build` on the change in the project directory, and appends one section per execution to `openspec/changes/{name}/telemetry.md`, recomputing the change total at the top. It prints one JSON line (`written` or `skipped` with a reason), exits 2 only on a usage error, and never runs git.
- Each section records, for the coordinator and every subagent, model and variant, requests, input, output, reasoning, cache read and cache write tokens, cache misses, cost, model time, tool calls, tool errors, a per-tool breakdown, and subagents dispatched, grouped by segment (Spec, Design for `/sai-plan`; Implement, Review, Fix implement for `/sai-build`). A missing datum shows as `unavailable` and partial totals are marked `≥`. Dispatch calls (`task`, `subagent`) count only as subagents dispatched. The coordinator's still-running closing turn is excluded and noted.
- Review findings per segment: `/sai-plan` reads found counts from the first round file's `Summary:` line and pending counts from the last; `/sai-build` reads found counts from the review worker's first write of `review.md` in `opencode.db` and pending counts from `review.md` on disk. Implement and fix-implement segments show findings as `unavailable`.
- The collector skips without writing on Claude Code, when the change directory, database, `node:sqlite`, supported schema, or execution is missing, when an existing `telemetry.md` was not written by the tool, and when the execution is already recorded.
- New shared policy `sai/policies/change-telemetry.md`: the gate (direct invocation, resolved change, existing change directory, `experimental.changeTelemetry` is `true`), the single `collect` call with the run status, the one-line relay of a skip reason, and the commit sequence (`git check-ignore -q`, then `git add` and `git commit -- <path>` of that one file; an ignored file stays on disk and the report says so).
- `sai/commands/plan/coordinator.md` and `sai/commands/build/coordinator.md` fetch the policy. `/sai-plan` collects before its run is closed (its run directory still holds the round files), with `--run-dir`, and before the closing line; `/sai-build` collects after its decision records and before its report.
- `sai/commands/plan/cycle.md`: every review round file ends with `Summary: High=<n> Medium=<n> Low=<n>`, counting the findings whose state in that file is `open`.
- `sai/tools/project-settings.js`: new hand-edited boolean catalogue key `experimental.changeTelemetry`, with no label so the settings screen does not list it; documented in `docs/project-settings.md` with a `Change telemetry` section.
- `openspec/schemas/sai-workflow/schema.yaml`: optional artifact `telemetry` (`generates: telemetry.md`, `requires: []`) with the new template `openspec/schemas/sai-workflow/templates/telemetry.md`.
- `sai/tools/opencode-db.js` now also exports `directoryForms` and `parseInvocation`, moved from `sai/tools/retrospective.js`, whose output is unchanged.
- `sai/policies/tool-resolution.md` lists `change-telemetry.js` and its invocation.
- Scope drift, implemented as reported by the implementer: the `--status` and `--run-dir` options, the `subagent` dispatch tool name besides `task`, and the skip that leaves a foreign or already-recorded `telemetry.md` untouched.

## Capabilities

### New Capabilities

- `change-telemetry`: optional per-execution cost and review telemetry of direct `/sai-plan` and `/sai-build` runs on opencode, written to `telemetry.md` behind the experimental setting.
- `review-round-summaries`: every `/sai-plan` review round file ends with a `Summary:` tally of its open findings.

### Modified Capabilities

- `project-settings`: the catalogue gains the boolean key `experimental.changeTelemetry`.
- `sai-workflow-schema`: the schema and templates declare eleven artifacts, adding the optional `telemetry`.
- `plan-segment-cycle`: the finding counts recorded in `telemetry.md` are exempt from the rule that no file records pending findings.
- `implement-new-loop`: `/sai-build` also loads the `change-telemetry` policy at its close.

## Impact

New files:
- `sai/tools/change-telemetry.js`
- `sai/policies/change-telemetry.md`
- `openspec/schemas/sai-workflow/templates/telemetry.md`
- `test/change-telemetry.test.js`
- `test/change-telemetry-contract.test.js`

Modified files:
- `sai/commands/plan/coordinator.md`
- `sai/commands/plan/cycle.md`
- `sai/commands/build/coordinator.md`
- `sai/tools/opencode-db.js`
- `sai/tools/retrospective.js`
- `sai/tools/project-settings.js`
- `sai/policies/tool-resolution.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `docs/project-settings.md`
- `test/project-settings.test.js`
- `test/plan-family.test.js`
- `test/implement-family.test.js`

Known limitations: synchronous persistence of a live session's latest step to `opencode.db` is inferred from opencode source, not verified, and the coordinator's closing turn is excluded; only the opencode V2 schema is supported; in this repository `.gitignore` ignores `openspec/changes/**`, so `telemetry.md` normally stays uncommitted; the implement and fix-implement step reviews of `/sai-build` report findings as unavailable; Claude Code, the `/sai-explore` `Plan - Unattended` route, and `/sai-deep-review` record no telemetry.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Future scope, outside this change: Claude Code support should collect the same per-agent figures that its `/usage` view shows (per-model input, output, cache read and write tokens, web searches, cost, request count, share of input from cache, and misses). Undecided: whether a later change adds telemetry for the `/sai-explore` `Plan - Unattended` route and `/sai-deep-review` (E13).

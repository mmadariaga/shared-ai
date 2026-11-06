# change-telemetry Specification

## Purpose
Record the cost and review figures of each direct `/sai-plan` and `/sai-build` execution on opencode in the change's optional `telemetry.md`, read after the fact from `opencode.db`.

## Requirements

### Requirement: An experimental project setting gates change telemetry

The settings catalogue in `sai/tools/project-settings.js` SHALL declare the boolean key `experimental.changeTelemetry` with the label `Change telemetry`, the section `Experimental`, and the absent text `off`, so the project behavior settings screen lists it in its `Experimental` section; the key MAY also be edited by hand. A non-boolean value SHALL be dropped with a warning that it must be true or false. A coordinator SHALL treat any value other than `true`, including an absent key or a failing settings read, as disabled.

#### Scenario: an absent key leaves the close unchanged
- **WHEN** `/sai-plan` or `/sai-build` closes in a project whose settings do not set `experimental.changeTelemetry` to `true`
- **THEN** the command runs no collector, writes no `telemetry.md`, makes no telemetry commit, and adds no telemetry line to its report

#### Scenario: a local override disables the setting
- **WHEN** `.sai/settings.jsonc` sets `experimental.changeTelemetry` to `true` and `.sai/settings.local.jsonc` sets it to `false`
- **THEN** the reader returns `false` for the key

#### Scenario: a non-boolean value is dropped
- **WHEN** `.sai/settings.jsonc` sets `experimental.changeTelemetry` to `"yes"`
- **THEN** the reader returns no value for the key and a warning that `experimental.changeTelemetry` must be true or false

### Requirement: The change telemetry setting is documented

`docs/project-settings.md` SHALL list `experimental.changeTelemetry` in its settings table and SHALL describe it in a `Change telemetry` section: edited in the `Experimental` section of the project behavior settings screen or by hand, absent reads as `false`, experimental, what `telemetry.md` records, the opencode-only support, the direct commands and the in-session routes that record, and the ignore-aware commit.

#### Scenario: the settings page documents the key
- **WHEN** `docs/project-settings.md` is read
- **THEN** its settings table has an `experimental.changeTelemetry` row with the values `true` or `false`, and the page has a `## Change telemetry` section

### Requirement: The coordinator runs the collector once at its close with the run status

The coordinator SHALL run `change-telemetry.js collect --harness <claude|opencode> --command <sai-plan|sai-build|sai-explore-plan|sai-explore-direct-build> --change {name} --cwd <project-root> --status <status>` once, after the last segment ended and before the closing line, passing no figure of its own. `<status>` SHALL be `completed`, `failed`, `stopped`, `blocked`, or `unanswered` for a direct command, so every run outcome records its execution; the Direct Build route SHALL collect only at its clean close with `completed`.

#### Scenario: a stopped build records its execution
- **WHEN** a `/sai-build` run with the setting enabled is stopped by the user
- **THEN** the coordinator runs the collector with `--status stopped` and the appended section is marked `stopped`

#### Scenario: the Direct Build route passes completed
- **WHEN** a Direct Build - Unattended run reaches its clean close with the setting enabled
- **THEN** the coordinator runs the collector with `--command sai-explore-direct-build` and `--status completed`

### Requirement: /sai-plan collects before its run directory is removed

`/sai-plan` SHALL run the collector before its run is closed and before its closing line and publication offer, passing `--run-dir` set to the run directory, which still holds the review round files. The Plan - Unattended route SHALL do the same inside the explore session with `--command sai-explore-plan`. `/sai-build` SHALL run the collector after its decision records and before its report, with no `--run-dir`.

#### Scenario: the plan collector reads the run directory
- **WHEN** a `/sai-plan` run with the setting enabled reaches its close
- **THEN** the coordinator runs the collector with `--command sai-plan` and `--run-dir` set to the run directory before the run is closed and before the closing line

### Requirement: The collector prints one JSON line

The collector SHALL print one JSON line, `{"outcome": "written", "path", "message"}` or `{"outcome": "skipped", "reason"}`, and exit 0. It SHALL exit 2 with `{"error": {"code": "USAGE", "message"}}` only for a usage error: an unknown option, or an invalid harness, command, change name, missing `--cwd`, or status. Any other collection error SHALL be reported as `skipped`.

#### Scenario: a usage error exits 2
- **WHEN** the collector runs with `--status done`
- **THEN** it exits 2 with a `USAGE` error and writes nothing

### Requirement: A skipped collection gives a one-line reason and never changes the command outcome

On a `skipped` outcome, the coordinator SHALL add the reason as one line to its closing report and commit nothing; a tool that cannot run or prints no JSON line SHALL be handled the same way, with one line naming the failure. A skip SHALL write or modify no `telemetry.md`. The command SHALL close with its normal result whatever the collector does.

#### Scenario: an unreadable database leaves the command result intact
- **WHEN** the collector cannot open `opencode.db`
- **THEN** it returns `skipped` with the reason, no `telemetry.md` is written or modified, and the command closes with its normal result and that one line

### Requirement: The collector skips unsupported or unsafe collections

The collector SHALL return `skipped` without writing on Claude Code, saying change telemetry is not supported there yet; when `openspec/changes/{name}/` is missing; when `opencode.db` or `node:sqlite` is unavailable or the schema is unsupported; when no matching execution is found; when `telemetry.md` exists but was not written by the tool; and when the execution is already recorded.

#### Scenario: Claude Code collects nothing
- **WHEN** `/sai-build` closes on Claude Code with the setting enabled
- **THEN** the collector returns `skipped` without reading any database, no `telemetry.md` is written, and the closing report states in one line that the harness is not supported yet

#### Scenario: a hand-written telemetry file is left untouched
- **WHEN** `openspec/changes/{name}/telemetry.md` exists without the tool's marker
- **THEN** the collector returns `skipped` saying the file was not written by the tool and leaves it unchanged

#### Scenario: an already-recorded execution is not appended twice
- **WHEN** the collector runs again for an execution whose section is already in `telemetry.md`
- **THEN** it returns `skipped` and leaves the file unchanged

### Requirement: The collector measures the latest execution of the command on the change in the project directory

The collector SHALL read `opencode.db` read-only, only its V2 tables `session_v2` and `session_message`, and SHALL select the latest invocation of the command whose root session directory is the project directory, in any separator form, and whose change is the given one. An execution SHALL span from its invocation to the next invocation in the same root session, with the descendant sessions created in that span as its subagents.

#### Scenario: a sibling worktree is not mixed in
- **WHEN** a later `/sai-build` execution on the same change ran in a sibling worktree directory
- **THEN** the collector measures the latest execution whose root session directory is the given project directory

### Requirement: The change of an execution comes from its invocation or its writes

The collector SHALL take the change of an execution from its invocation arguments, and otherwise from the single change that the execution's sessions wrote to. An execution whose sessions wrote to several changes, or to none, and whose invocation names no change SHALL NOT match.

#### Scenario: the invocation names the change
- **WHEN** the latest `/sai-plan` invocation carries the change name in its arguments
- **THEN** the collector matches that execution to that change

### Requirement: Per-agent rows report model, tokens, cost, time, and tool calls

For the coordinator and each subagent, the collector SHALL report the model and variant, requests, input, output, reasoning, cache read and cache write tokens, cache misses, cost, model time, tool calls, tool errors, a per-tool breakdown, and subagents dispatched. Each assistant message SHALL be one request; tool calls SHALL be its `data.content[]` entries with `type: "tool"`, and a tool error a call whose `state.status` is `error`.

#### Scenario: a tool error is counted
- **WHEN** an agent made three `read` calls and one of them has `state.status` `error`
- **THEN** its row shows three tool calls, one tool error, and the breakdown `read×3`

### Requirement: A missing datum is unavailable, never zero

A request lacking token usage, model, variant, cost, or a start or completion time SHALL leave that datum `unavailable`, never zero. A total that depends on a missing datum SHALL be marked partial with `≥`, and a total with no known value SHALL show as `unavailable`.

#### Scenario: a request without cost makes the cost total partial
- **WHEN** one request of an agent has no `data.cost`
- **THEN** that agent's cost and every cost total that includes it are shown with `≥`

### Requirement: A cache miss is a later request that reads no cache

A cache miss SHALL be a request with cache read `0` that is not the agent's first request, so an agent with a single request SHALL report zero misses.

#### Scenario: a single-request agent has no cache miss
- **WHEN** an agent made exactly one request with cache read `0`
- **THEN** its cache misses are `0`

### Requirement: Dispatch calls count only as subagents dispatched

Dispatch calls, recognized by the tool names `task` and `subagent`, SHALL count only as the agent's subagents dispatched and SHALL stay out of its tool-call total and breakdown, so no call is counted twice. A dispatched subagent whose child session is not in `opencode.db` SHALL appear as an `unavailable` row, and every total that depends on it SHALL be marked partial.

#### Scenario: dispatch calls are not counted twice
- **WHEN** an agent made two `read` calls and one `task` call
- **THEN** its row shows two tool calls and one subagent dispatched

#### Scenario: an unrecorded child session shows as unavailable
- **WHEN** a `task` call names a child session that is not in `opencode.db`
- **THEN** the subagent appears as an `unavailable` row and the dependent totals are marked partial

### Requirement: The coordinator's closing turn is left out

The collector SHALL leave out the coordinator's last request when it has no completion time, because it is the closing turn still running, and each section SHALL state in a note that the coordinator row excludes its own closing turn.

#### Scenario: a running closing turn is excluded
- **WHEN** the coordinator's last assistant message has no `data.time.completed`
- **THEN** the coordinator row does not count that request and the section carries the closing-turn note

### Requirement: telemetry.md appends one section per execution and recomputes the change total

The collector SHALL write only `openspec/changes/{name}/telemetry.md`, atomically, and SHALL run no git command. Each execution SHALL append one section at the end, headed with its number, the command, and its final status, leaving earlier sections unchanged, and SHALL recompute the change total and execution count at the top from every section.

#### Scenario: a second execution appends a section
- **WHEN** the collector writes for a change whose `telemetry.md` already holds one section
- **THEN** it appends `## Execution 2` at the end, leaves `## Execution 1` unchanged, and updates the change total and the execution count at the top

### Requirement: Each section lists the command's segments in order

A section SHALL hold the start time, root session, wall time, a coordinator table, and one subsection per segment in command order: Spec and Design for `/sai-plan` and the Plan - Unattended route; Implement, Review, and Fix implement for `/sai-build`; Implement, Backfill, and Archive for the Direct Build - Unattended route. A segment that did not run SHALL show `Not run.`, not zeros. Subagents outside any segment SHALL be listed under `Other agents`.

#### Scenario: a skipped spec segment shows as not run
- **WHEN** a `/sai-plan` execution ran only the design segment because `proposal.md` and `specs/` already existed
- **THEN** the Spec subsection says `Not run.`

#### Scenario: an absent fix segment shows as not run
- **WHEN** a `/sai-build` execution created no implementation worker after its review worker
- **THEN** the Fix implement subsection says `Not run.`

### Requirement: Plan review findings come from the round Summary lines

For each `/sai-plan` segment and each Plan - Unattended segment, the found counts SHALL come from the `Summary:` line of its first review round file and the pending counts from its last round file under `reviews/` of the run directory, so a segment that ends after its first round reports the same counts for both. A missing or unreadable `Summary:` line SHALL show that count as `unavailable`.

#### Scenario: a plan segment with one round
- **WHEN** a plan segment's review ended after its first round, whose file ends with `Summary: High=1 Medium=0 Low=2`
- **THEN** the segment reports found `High=1 Medium=0 Low=2` and pending `High=1 Medium=0 Low=2`

#### Scenario: a round file without a Summary line
- **WHEN** a plan segment's round file carries no `Summary:` line
- **THEN** that segment's findings show as `unavailable`

### Requirement: Build review findings come from review.md

In the `/sai-build` review segment, found counts SHALL come from the `Summary:` tally of the review worker's first write of `review.md` recorded in `opencode.db`, and pending counts from `review.md` on disk at close, counting each finding heading without a `(FIXED)` mark. When `review.md` is absent at close, both SHALL show as `unavailable`. The implement and fix-implement segments SHALL show their findings as `unavailable`.

#### Scenario: review.md absent at close
- **WHEN** a `/sai-build` execution closes with no `openspec/changes/{name}/review.md` on disk
- **THEN** the Review subsection shows both found and pending findings as `unavailable`

#### Scenario: implement step reviews have no tally
- **WHEN** a `/sai-build` section is written
- **THEN** its Implement and Fix implement subsections show their findings as `unavailable`

### Requirement: The coordinator commits telemetry.md only when it is not ignored

After a `written` outcome, the coordinator SHALL check the path with `git check-ignore -q`. When not ignored, it SHALL `git add` that path alone and run `git commit -m "<subject>" -- <path>` with a Conventional Commits subject of at most 50 characters. When ignored, the file SHALL stay on disk uncommitted and one report line SHALL say so. It SHALL never force-add or push, and SHALL commit only this file. A direct `/sai-plan` or `/sai-build` invocation authorizes this one local commit; on an in-session route the route selection authorizes it, and the Direct Build route's telemetry commit is its second pre-authorized local commit.

#### Scenario: an ignored telemetry file stays uncommitted
- **WHEN** the project's `.gitignore` ignores `openspec/changes/**` and the collector writes `telemetry.md`
- **THEN** the coordinator makes no commit and its closing report says the file stays on disk uncommitted

#### Scenario: a tracked change directory commits only the telemetry file
- **WHEN** `telemetry.md` is not ignored and another path is already staged
- **THEN** the coordinator commits only `telemetry.md` and leaves the other staged path out of the commit

### Requirement: The sai-workflow schema declares telemetry as an optional artifact

`openspec/schemas/sai-workflow/schema.yaml` SHALL declare the artifact `telemetry` with `generates: telemetry.md`, the template `telemetry.md`, and `requires: []`, with an instruction that `change-telemetry.js` writes it and it is not written by hand. No other artifact SHALL require `telemetry`, and `openspec/schemas/sai-workflow/templates/telemetry.md` SHALL exist.

#### Scenario: no artifact depends on telemetry
- **WHEN** `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it declares `telemetry` with `requires: []` and no artifact lists `telemetry` in its `requires`

### Requirement: The tool resolution policy lists the collector

`sai/policies/tool-resolution.md` SHALL list `change-telemetry.js` among the resolvable tool names and SHALL give its `collect` invocation.

#### Scenario: the collector invocation is documented
- **WHEN** `sai/policies/tool-resolution.md` is read
- **THEN** it names `change-telemetry.js` and its `collect --harness` invocation

### Requirement: The /sai-explore in-session routes record one telemetry section per slice

The `/sai-explore` **Plan - Unattended** route SHALL record telemetry at its plan close; the **Direct Build - Unattended** route SHALL record it after the archive worker's clean `completed` result and before its terminal report. Each SHALL pass its own command name (`sai-explore-plan` or `sai-explore-direct-build`). Direct Build SHALL pass `--status completed` and SHALL record nothing for a run that stops earlier.

#### Scenario: the plan route collects at its plan close
- **WHEN** a Plan - Unattended slice closes with `experimental.changeTelemetry` set to `true`
- **THEN** the coordinator runs the collector with `--command sai-explore-plan` and `--run-dir` set to the run directory before the closing line, and one section is appended

#### Scenario: Direct Build collects after its archive
- **WHEN** the archive worker returns a clean `completed` result in a Direct Build - Unattended slice
- **THEN** the coordinator runs the collector with `--command sai-explore-direct-build` and `--status completed` before the terminal report, then makes the second local commit

#### Scenario: a stopped Direct Build records nothing
- **WHEN** a Direct Build - Unattended run stops before the archive worker's clean `completed` result
- **THEN** no collector runs, no `telemetry.md` is written, and no second commit is made

### Requirement: An in-session route is discovered through its first worker that writes the change

The collector SHALL treat as the route session the `/sai-explore` root session whose route worker wrote under `openspec/changes/{name}/`, start the window at that first worker's creation, end it at the collection, and choose the latest such session when several wrote the change. It SHALL measure the root session under the name `sai-explore`.

#### Scenario: the first writing worker starts the window
- **WHEN** the explore session made a request before its first Plan route worker wrote the change
- **THEN** that request is outside the window, and the segment rows follow `sai-1-spec-proposal-worker` and `sai-2-design-worker`

#### Scenario: a direct plan execution is not an in-session route
- **WHEN** only a direct `/sai-plan` session wrote the change
- **THEN** the collector returns `skipped`, naming the `sai-explore (Plan - Unattended)` route

#### Scenario: the design worker alone starts the window
- **WHEN** the spec segment was already done and only `sai-2-design-worker` wrote the change
- **THEN** the window starts at that worker, and the Spec subsection says `Not run.`

### Requirement: In-session route sections name the route and list its segments

The collector SHALL head an in-session section with `sai-explore (Plan - Unattended)` or `sai-explore (Direct Build - Unattended)`, list the Plan route's `Spec` and `Design` segments and the Direct Build route's `Implement`, `Backfill`, and `Archive` segments in command order, show a segment that did not run as `Not run.`, and report an in-session route's findings as `unavailable`.

#### Scenario: a Direct Build section lists its three segments
- **WHEN** a Direct Build - Unattended section is written
- **THEN** its Implement, Backfill, and Archive subsections name `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker`

#### Scenario: an in-session findings line is unavailable
- **WHEN** a Direct Build - Unattended section is written
- **THEN** its findings show as `unavailable` because the route records no review-finding tally

### Requirement: Only the coordinator that owns a run records telemetry

The plan and build coordinators, and the `/sai-explore` Plan - Unattended and Direct Build - Unattended routes, SHALL record telemetry only when the run resolved its change name, `openspec/changes/{name}/` exists, and the setting is `true`. `/sai-deep-review` SHALL record nothing. Only the run's owning coordinator SHALL record it; a worker SHALL NOT.

#### Scenario: a deep-review run records nothing
- **WHEN** `/sai-deep-review` closes with the setting enabled
- **THEN** it runs no collector and writes no `telemetry.md`

#### Scenario: a worker never records telemetry
- **WHEN** a plan, build, or route worker finishes
- **THEN** it writes no `telemetry.md`, whatever the setting

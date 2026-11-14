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

`docs/project-settings.md` SHALL list `experimental.changeTelemetry` in its settings table and SHALL describe it in a `Change telemetry` section: edited in the `Experimental` section of the project behavior settings screen or by hand, absent reads as `false`, experimental, what `telemetry.md` records (including the cache hit share, the cache misses with their average overcost, and the `By command` table), the support on both Claude Code and opencode with the fields Claude Code does not record (`reasoning`, `variant`) and its cost estimated from the dated price table in `sai/tools/model-prices.js`, the direct commands and the in-session routes that record, that a completed Direct Build route writes the file into the archived change folder, that an in-session route's window starts at the slice's first route worker, and the ignore-aware commit.

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

The collector SHALL return `skipped` without writing when the change's folder is missing, neither at `openspec/changes/{name}/` nor at `openspec/changes/archive/YYYY-MM-DD-{name}/`; on opencode, when `opencode.db` or `node:sqlite` is unavailable or the schema is unsupported; on Claude Code, when the project's transcript folder is missing or unreadable; when no matching execution is found; when `telemetry.md` exists but was not written by the tool; and when the execution is already recorded.

#### Scenario: Claude Code collects nothing
- **WHEN** `/sai-build` closes on Claude Code with the setting enabled and the project's transcript folder cannot be read
- **THEN** the collector returns `skipped` with the reason, no `telemetry.md` is written, and the closing report states the reason in one line

#### Scenario: a hand-written telemetry file is left untouched
- **WHEN** `openspec/changes/{name}/telemetry.md` exists without the tool's marker
- **THEN** the collector returns `skipped` saying the file was not written by the tool and leaves it unchanged

#### Scenario: an already-recorded execution is not appended twice
- **WHEN** the collector runs again for an execution whose marker is already in `telemetry.md`
- **THEN** it returns `skipped` saying the execution is already recorded and leaves the file unchanged

#### Scenario: an archived change folder is collected
- **WHEN** `openspec/changes/{name}/` is absent and `openspec/changes/archive/2026-02-01-{name}/` exists
- **THEN** the collector writes `telemetry.md` in the archived folder instead of returning `skipped`

### Requirement: The collector measures the latest execution of the command on the change in the project directory

On opencode the collector SHALL read `opencode.db` read-only, only its V2 tables `session_v2` and `session_message`; on Claude Code it SHALL read the project's session transcripts read-only. It SHALL select the latest invocation of the command whose root session belongs to the project directory, in any separator form, and whose change is the given one. An execution SHALL span from its invocation to the next invocation in the same root session, with the descendant sessions (on Claude Code, the subagents) created in that span as its subagents.

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

### Requirement: Dispatch calls count only as subagents dispatched

Dispatch calls, recognized by the tool names `task` and `subagent` on opencode and `Agent` on Claude Code, SHALL count only as the agent's subagents dispatched and SHALL stay out of its tool-call total and breakdown, so no call is counted twice. A Claude Code `SendMessage` continuation SHALL count as no new dispatch. A dispatched subagent whose child session is not recorded (not in `opencode.db`, or with no transcript under the session's `subagents/` folder) SHALL appear as an `unavailable` row, and every total that depends on it SHALL be marked partial.

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

The collector SHALL write only the change's `telemetry.md` — at `openspec/changes/{name}/telemetry.md`, or at `openspec/changes/archive/YYYY-MM-DD-{name}/telemetry.md` when the change is archived — atomically, and SHALL run no git command. Each execution SHALL append one section at the end, headed with its number, the command, and its final status, leaving earlier sections unchanged, and SHALL recompute the change total and execution count at the top from every section.

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

For each `/sai-plan` segment, each Plan - Unattended segment, and the Direct Build - Unattended Implement segment, the found counts SHALL come from the `Summary:` line of its first review round file and the pending counts from its last round file under `reviews/` of the run directory, so a segment that ends after its first round reports the same counts for both. A missing or unreadable `Summary:` line SHALL show that count as `unavailable`.

#### Scenario: a plan segment with one round
- **WHEN** a plan segment's review ended after its first round, whose file ends with `Summary: High=1 Medium=0 Low=2`
- **THEN** the segment reports found `High=1 Medium=0 Low=2` and pending `High=1 Medium=0 Low=2`

#### Scenario: a round file without a Summary line
- **WHEN** a plan segment's round file carries no `Summary:` line
- **THEN** that segment's findings show as `unavailable`

#### Scenario: a Direct Build implement segment reads its round files
- **WHEN** a Direct Build - Unattended run passes `--run-dir` with `implement-round-1.md` and `implement-round-4.md`
- **THEN** Implement reports found from the first file and pending from the last, and Backfill and Archive report `unavailable`

### Requirement: Build review findings come from review.md

In the `/sai-build` review segment, found counts SHALL come from the `Summary:` tally of the review worker's first write of `review.md` recorded by the harness (in `opencode.db` on opencode, in the review worker's transcript on Claude Code, where the write tools are `Write`, `Edit`, and `MultiEdit`), and pending counts from `review.md` on disk at close, counting each finding heading without a `(FIXED)` mark. When `review.md` is absent at close, both SHALL show as `unavailable`. The implement and fix-implement segments SHALL show their findings as `unavailable`.

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

`openspec/schemas/sai-workflow/schema.yaml` SHALL declare the artifact `telemetry` with `generates: telemetry.md`, the template `telemetry.md`, and `requires: []`, with an instruction that `change-telemetry.js` writes it and it is not written by hand. The artifact's description and instruction SHALL state the real scope: the collector writes it at the close of a direct `/sai-plan` or `/sai-build` run and of the `/sai-explore` Plan - Unattended and Direct Build - Unattended routes, on Claude Code or opencode, from the harness session data, when `experimental.changeTelemetry` is `true`; they SHALL NOT limit it to opencode or to `opencode.db`. No other artifact SHALL require `telemetry`, and `openspec/schemas/sai-workflow/templates/telemetry.md` SHALL exist.

#### Scenario: no artifact depends on telemetry
- **WHEN** `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it declares `telemetry` with `requires: []` and no artifact lists `telemetry` in its `requires`

#### Scenario: the schema instruction names both harnesses and every recording route
- **WHEN** the `telemetry` artifact's description and instruction are read
- **THEN** they name Claude Code and opencode, direct `/sai-plan` and `/sai-build`, and the `/sai-explore` Plan - Unattended and Direct Build - Unattended routes, and name no opencode-only source

### Requirement: The tool resolution policy lists the collector

`sai/policies/tool-resolution.md` SHALL list `change-telemetry.js` among the resolvable tool names and SHALL give its `collect` invocation with the `sai-plan`, `sai-build`, `sai-explore-plan`, and `sai-explore-direct-build` commands.

#### Scenario: the collector invocation is documented
- **WHEN** `sai/policies/tool-resolution.md` is read
- **THEN** it names `change-telemetry.js` and its `collect --harness` invocation

### Requirement: The /sai-explore in-session routes record one telemetry section per slice

The `/sai-explore` **Plan - Unattended** route SHALL record telemetry at its plan close; the **Direct Build - Unattended** route SHALL record it after the archive worker's clean `completed` result and before its terminal report. Each SHALL pass its own command name (`sai-explore-plan` or `sai-explore-direct-build`). Direct Build SHALL pass `--status completed` and `--run-dir` set to its run directory, SHALL write `telemetry.md` into the change's archived folder, and SHALL record nothing for a run that stops earlier.

#### Scenario: the plan route collects at its plan close
- **WHEN** a Plan - Unattended slice closes with `experimental.changeTelemetry` set to `true`
- **THEN** the coordinator runs the collector with `--command sai-explore-plan` and `--run-dir` set to the run directory before the closing line, and one section is appended

#### Scenario: Direct Build collects after its archive
- **WHEN** the archive worker returns a clean `completed` result in a Direct Build - Unattended slice
- **THEN** the coordinator runs the collector with `--command sai-explore-direct-build`, `--status completed`, and `--run-dir` set to the run directory before the terminal report, writes `telemetry.md` into the archived folder, and then makes the second local commit

#### Scenario: a stopped Direct Build records nothing
- **WHEN** a Direct Build - Unattended run stops before the archive worker's clean `completed` result
- **THEN** no collector runs, no `telemetry.md` is written, and no second commit is made

### Requirement: An in-session route is discovered through its first worker that writes the change

The collector SHALL treat as the route session the `/sai-explore` root session whose route worker named `openspec/changes/{name}/` in a tool input, start the window at the slice's first route worker, end it at the collection, and choose the latest such session when several named the change. For the Plan route the first writing worker starts the window; for Direct Build the current slice starts at its first route worker, after the previous slice's last backfill or archive worker that named a different change. A replaced worker of the current slice SHALL stay inside the slice, and a `sai-direct-build-worker` whose session carries `--no-specs` SHALL be excluded as a POC implementer. It SHALL measure the root session under the name `sai-explore`.

#### Scenario: the first writing worker starts the window
- **WHEN** the explore session made a request before its first Plan route worker wrote the change
- **THEN** that request is outside the window, and the segment rows follow `sai-1-spec-proposal-worker` and `sai-2-design-worker`

#### Scenario: a direct plan execution is not an in-session route
- **WHEN** only a direct `/sai-plan` session wrote the change
- **THEN** the collector returns `skipped`, naming the `sai-explore (Plan - Unattended)` route

#### Scenario: the design worker alone starts the window
- **WHEN** the spec segment was already done and only `sai-2-design-worker` wrote the change
- **THEN** the window starts at that worker, and the Spec subsection says `Not run.`

#### Scenario: a Direct Build slice starts at its first route worker
- **WHEN** the explore session ran a previous Direct Build slice and made a request before the current slice's implementer
- **THEN** the window starts at the current slice's first worker, and the previous slice stays outside it

#### Scenario: an implementer that reads another change does not end the slice
- **WHEN** the current slice's implementer read another change's archived proposal
- **THEN** the slice continues from that implementer, because only a backfill or archive worker that named a different change starts the next slice

#### Scenario: a replaced archive worker stays in the current slice
- **WHEN** a replaced archive worker of the current slice named the change in its tool input
- **THEN** both archive workers stay inside the slice and are measured

#### Scenario: a POC implementer is excluded
- **WHEN** a `sai-direct-build-worker` session carries `--no-specs`
- **THEN** it starts no slice and contributes no row

### Requirement: In-session route sections name the route and list its segments

The collector SHALL head an in-session section with `sai-explore (Plan - Unattended)` or `sai-explore (Direct Build - Unattended)`, list the Plan route's `Spec` and `Design` segments and the Direct Build route's `Implement`, `Backfill`, and `Archive` segments in command order, show a segment that did not run as `Not run.`, report the Direct Build Implement findings from its round files, and report Backfill and Archive findings as `unavailable` because those segments record no tally.

#### Scenario: a Direct Build section lists its three segments
- **WHEN** a Direct Build - Unattended section is written
- **THEN** its Implement, Backfill, and Archive subsections name `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker`

#### Scenario: an in-session findings line is unavailable
- **WHEN** a Direct Build - Unattended section is written
- **THEN** Backfill and Archive show their findings as `unavailable`, while Implement reads its own round files

### Requirement: Only the coordinator that owns a run records telemetry

The plan and build coordinators, and the `/sai-explore` Plan - Unattended and Direct Build - Unattended routes, SHALL record telemetry only when the run resolved its change name, the change's folder exists either active at `openspec/changes/{name}/` or archived at `openspec/changes/archive/YYYY-MM-DD-{name}/`, and the setting is `true`. `/sai-deep-review` SHALL record nothing. Only the run's owning coordinator SHALL record it; a worker SHALL NOT.

#### Scenario: a deep-review run records nothing
- **WHEN** `/sai-deep-review` closes with the setting enabled
- **THEN** it runs no collector and writes no `telemetry.md`

#### Scenario: a worker never records telemetry
- **WHEN** a plan, build, or route worker finishes
- **THEN** it writes no `telemetry.md`, whatever the setting

### Requirement: A change with explore_origin records its exploration once

When the change's `.openspec.yaml` lists `explore_origin` sessions, a collection on either harness SHALL add an `## Exploration` section to `telemetry.md`, placed after the change total and before the first `## Execution` section, only in the collection that writes the file while it has no `## Exploration` section yet. A later collection SHALL keep the existing section unchanged. A change without `explore_origin` SHALL get no `## Exploration` section, and the rest of `telemetry.md` SHALL be written as before. The collector SHALL do this by itself, with no extra flag, so a direct `/sai-plan`, a direct `/sai-build`, and both in-session `/sai-explore` routes record it on Claude Code and on opencode. Each listed id SHALL be read with the reader of its own harness, inferred from the id's shape (`ses_…` is an opencode session, a UUID is a Claude Code session), whichever harness runs the collection, so one list MAY mix both harnesses. The exploration of a Claude Code session SHALL show its reasoning and variant as `unavailable` and its cost as the estimate from the dated price table in `sai/tools/model-prices.js`, marked `~`.

#### Scenario: the first collection writes the exploration
- **WHEN** the collector writes `telemetry.md` for a change whose `.openspec.yaml` reads `explore_origin: [ses_origin]` and the file has no `## Exploration` section
- **THEN** the written file holds one `## Exploration` section with an `### Origin session ses_origin` subsection, before `## Execution 1`

#### Scenario: a later collection keeps the exploration unchanged
- **WHEN** the collector appends `## Execution 2` to a `telemetry.md` that already holds an `## Exploration` section
- **THEN** the file still holds exactly one `## Exploration` section, with its earlier content unchanged

#### Scenario: a change without explore_origin has no exploration
- **WHEN** the collector writes `telemetry.md` for a change whose `.openspec.yaml` has no `explore_origin` key
- **THEN** the file holds no `## Exploration` section

#### Scenario: a Claude Code origin session records its exploration
- **WHEN** `collect --harness claude` writes `telemetry.md` for a change whose `.openspec.yaml` lists a Claude Code session UUID that holds a `/sai-explore` invocation in the project's transcripts
- **THEN** the `## Exploration` section holds an `### Origin session <uuid>` subsection with the `sai-explore` coordinator row read from that transcript

### Requirement: Each origin session yields one exploration segment

The `## Exploration` section SHALL hold one `### Origin session <sessionID>` subsection per distinct session listed in `explore_origin`; a session listed more than once SHALL yield one subsection. A segment SHALL cover the coordinator and the subagents of the session's `explore` invocations, each invocation lasting until the session's next invocation, minus every route window of that session. A route window SHALL run from a slice's first route worker to the turn that ran its collector. In the session where the measured route runs, the segment SHALL end where that route starts, so each slice records its own segment. Each segment SHALL report its coordinator row and an "Other agents" table, in which subagents of the exploration, proof-of-concept workers included, are listed.

#### Scenario: a duplicated session yields one segment
- **WHEN** `explore_origin` lists the same session twice
- **THEN** the `## Exploration` section holds one `### Origin session` subsection for that session

#### Scenario: route windows are left out of the segment
- **WHEN** an origin session ran a route for another slice between two parts of its exploration
- **THEN** the segment's figures cover the exploration parts only and leave out that route window

### Requirement: An exploration segment states whether it is shared

Each segment SHALL carry a `Shared:` line. When other changes had a route window in that origin session, the line SHALL name them; otherwise it SHALL state that no other change had a route window. Either form SHALL state that other slices without a route window may exist. The section SHALL note that adding several `telemetry.md` files counts a shared exploration more than once.

#### Scenario: a sibling route is named
- **WHEN** the origin session also ran a route for the change `sibling-change`
- **THEN** the segment's `Shared:` line names `sibling-change` and states that other slices without a route window may exist

### Requirement: An unreadable origin session is recorded as unavailable

When a listed session is not a root session in the local data of its harness (`opencode.db` for an opencode session, the project's Claude Code transcripts for a Claude Code session), holds no `/sai-explore` invocation, belongs to a harness whose data is absent on the machine that collects, or has an id of no known harness, its subsection SHALL record the exploration as `unavailable` with the reason, and the collector SHALL still record the other origin sessions and the route execution.

#### Scenario: a session from another machine
- **WHEN** `explore_origin` lists a session that is not in the local data of its harness
- **THEN** that session's subsection reads `Exploration: unavailable` with the reason, and the execution section is still written

#### Scenario: an opencode origin without opencode.db on a Claude Code collection
- **WHEN** `collect --harness claude` runs for a change whose `explore_origin` lists an opencode session and `opencode.db` is absent on the machine
- **THEN** that session's subsection reads `Exploration: unavailable` with the reason, and the Claude Code execution section is still written

### Requirement: The collector resolves the explore root session of a subagent

`sai/tools/change-telemetry.js` SHALL offer the sub-command `explore-origin --harness <claude|opencode> --session <sessionID>`. On opencode it SHALL resolve the root session of the given session through `opencodeRoot` and print `{"outcome": "found", "session": <root sessionID>}` only when that root holds a `/sai-explore` invocation; otherwise, and with an unreadable database, it SHALL print `{"outcome": "skipped", "reason": ...}` and exit 0. On Claude Code it SHALL print `{"outcome": "found", "session": <sessionID>}` with the given session itself only when that session is a root session of the project's Claude Code transcripts and holds a `/sai-explore` invocation; otherwise, and with an unreadable transcript folder, it SHALL print `{"outcome": "skipped", "reason": ...}` and exit 0. A missing session, an opencode session that does not match `ses_...`, or a Claude Code session that is not a UUID SHALL be a usage error that exits 2. `sai/policies/tool-resolution.md` SHALL document this invocation beside `collect`.

#### Scenario: a subagent of an explore session
- **WHEN** `explore-origin --harness opencode --session <explorer sessionID>` runs for an explorer dispatched by a `/sai-explore` root session
- **THEN** it prints `{"outcome": "found", "session": <that root sessionID>}`

#### Scenario: a malformed session is a usage error
- **WHEN** `explore-origin` runs with `--session` missing, with `--harness opencode` and a value not matching `ses_...`, or with `--harness claude` and a value that is not a UUID
- **THEN** it exits 2 with a usage error

#### Scenario: a Claude Code explore session is found
- **WHEN** `explore-origin --harness claude --session <uuid>` runs for a root session of the project's transcripts that holds a `/sai-explore` invocation
- **THEN** it prints `{"outcome": "found", "session": <uuid>}`

#### Scenario: a Claude Code session without an explore invocation is skipped
- **WHEN** `explore-origin --harness claude --session <uuid>` runs for a session that is not in the project's transcripts or holds no `/sai-explore` invocation
- **THEN** it prints `{"outcome": "skipped", "reason": ...}` and exits 0

### Requirement: The exploration record is documented

`docs/project-settings.md`, `sai/policies/change-telemetry.md` § Exploration, and the `## Exploration` part of `openspec/schemas/sai-workflow/templates/telemetry.md` SHALL describe the exploration section: written once per change from `explore_origin` on both harnesses, one segment per listed session read with the reader of its own harness, shared segments counted in each change, an `unavailable` segment for a session missing from the data of its harness (`opencode.db` or the Claude Code transcripts), the fields unavailable on Claude Code (reasoning, variant), the Claude Code cost estimated from the dated price table in `sai/tools/model-prices.js`, and every listed session ID visible in a published issue.

#### Scenario: the documentation names the exploration section
- **WHEN** `docs/project-settings.md` and `sai/policies/change-telemetry.md` are read
- **THEN** both describe the `Exploration` section recorded from `explore_origin`

### Requirement: On Claude Code the collector reads the session transcripts through the shared reader

On Claude Code the collector SHALL read the project's session transcripts read-only through the shared reader `sai/tools/claude-transcripts.js`: `<config>/projects/<encoded-project>/<session>.jsonl` and, beside it, `<session>/subagents/agent-<id>.jsonl` with `agent-<id>.meta.json`, where `<config>` is `CLAUDE_CONFIG_DIR` when set and `~/.claude` otherwise. The same `experimental.changeTelemetry` setting SHALL gate collection on Claude Code and on opencode. The collector SHALL select its source by `--harness`, and both sources SHALL give the measurement the same request shape, so a Claude Code section has the same sections, rows, and totals as an opencode section.

#### Scenario: a direct /sai-plan is measured on Claude Code
- **WHEN** `collect --harness claude --command sai-plan` runs for a change whose `/sai-plan` execution is in the project's session transcripts
- **THEN** the collector writes a `telemetry.md` section with the coordinator row and the rows of the spec and design workers read from the session transcript and its `subagents/` folder

#### Scenario: a missing transcript folder skips the collection
- **WHEN** the project's transcript folder under `CLAUDE_CONFIG_DIR` (or `~/.claude`) is missing or unreadable
- **THEN** the collector returns `skipped` with the reason and writes no `telemetry.md`

### Requirement: On Claude Code an execution is anchored on its invocation record or its workers

On Claude Code the collector SHALL anchor a direct `/sai-plan` or `/sai-build` execution on its `<command-name>` user record in the session transcript, spanning to the next SAI command invocation of that session, and an in-session `/sai-explore` route on the `agentType` of its worker subagents. The execution identifier SHALL combine the session id and the anchor record's id. An execution that is not in the session transcripts SHALL make the collector return `skipped` with the reason and write no partial section.

#### Scenario: a Plan - Unattended route is found through its workers
- **WHEN** `collect --harness claude --command sai-explore-plan` runs and an explore session holds `sai-1-spec-proposal-worker` and `sai-2-design-worker` subagents that wrote the change
- **THEN** the section measures that explore session from its first writing worker

#### Scenario: a run split by /clear is not found
- **WHEN** `/clear` started a new Claude Code session in the middle of the run, so the session transcript holds no invocation of the command on the change
- **THEN** the collector returns `skipped` with the reason and writes no section

### Requirement: Claude Code figures come only from what the transcripts record

On Claude Code each request SHALL be one assistant `message.id`, however many transcript lines repeat it; each tool call SHALL count once by its `tool_use` id; and a `tool_result` with `is_error: true` SHALL count as one tool error of the tool call it answers. `Cache write` SHALL be the sum of the 5-minute and 1-hour cache creation tokens, or the unsplit cache creation value when the transcript has no split. `reasoning` and `variant` SHALL be `unavailable` in every Claude Code row and total, never `0`. The transcripts record no cost, so the cost of each Claude Code request SHALL be estimated from its tokens and the dated price table `sai/tools/model-prices.js`, and every estimated figure SHALL carry `~`. Each Claude Code section SHALL carry a note that states the price table date and that the transcripts record no cost, reasoning, or variant. A model with no price entry, or whose entry lacks the price of a token type the request used, SHALL have an `unavailable` cost, never zero, and every total that includes it SHALL be marked partial with `≥`. No other figure SHALL be estimated.

#### Scenario: repeated lines of one response are one request
- **WHEN** a subagent transcript holds three lines with the same `message.id`
- **THEN** that agent's row counts one request and its tokens once

#### Scenario: the cache write adds the 5-minute and 1-hour writes
- **WHEN** a request's usage carries `ephemeral_5m_input_tokens` 100 and `ephemeral_1h_input_tokens` 50
- **THEN** its cache write is 150

#### Scenario: cost, reasoning, and variant are unavailable on Claude Code
- **WHEN** a section is written from Claude Code transcripts for a model that has no entry in the price table
- **THEN** its cost, reasoning, and variant are `unavailable` in that model's rows, every cost total that includes them is marked `≥`, and the section carries the note that Claude Code transcripts record none of them

#### Scenario: a priced Claude Code cost is estimated
- **WHEN** a section is written from Claude Code transcripts for a model that has an entry in the price table
- **THEN** its cost is computed from the request tokens and that entry, shown with `~`, and the section note states the price table date

### Requirement: Each section names its harness

Each execution section SHALL name the harness it was collected from (`Claude Code` or `opencode`) beside its session. One `telemetry.md` MAY hold executions from both harnesses; a change total SHALL add each field over the executions that recorded it and SHALL be marked partial with `≥` when any execution lacks that field.

#### Scenario: a mixed-harness change total is partial for cost
- **WHEN** a `telemetry.md` holds an opencode execution with a known cost and a Claude Code execution whose model has no entry in the price table is appended
- **THEN** the Claude Code section reads `Harness: Claude Code`, and the change total's cost is marked `≥`

### Requirement: The collector detects cache-warming wakes from the wait command on both harnesses

The collector SHALL count as a wake the turn of an agent that the completion of its own `wait.js … warm` background wait opens, the main session included. It SHALL match the wait command and never the background task description or a reply literal (the wake literal, the stop literal, or the legacy `ok`). On Claude Code a wake SHALL open at the `<task-notification>` whose task id equals the background id returned for a shell `tool_use` that runs `wait.js` with `warm`; on opencode a wake SHALL open at the `synthetic` `session_message` with `metadata.source: "shell"` whose `<shell … command="…">` header runs `wait.js` with `warm`. A wake SHALL last to the next record that opens a turn, and a wait that returned `finished` SHALL still count as a wake.

#### Scenario: a wait task with another description is a wake
- **WHEN** a Claude Code agent arms `wait.js warm` in a background shell whose description is not `cache-warm` and its task notification later opens a turn
- **THEN** that turn counts as one wake of the agent

#### Scenario: an ok reply alone is not a wake
- **WHEN** an agent replies with the stop literal `cache warming stopped`, or the legacy `ok`, to a `dispose` message, or a reply closes a turn that no completed wait opened
- **THEN** the collector counts no wake for that reply

#### Scenario: a finished wait on opencode is a wake
- **WHEN** an opencode session holds a `synthetic` shell message for `wait.js warm` whose wait returned `finished`
- **THEN** the turn it opens counts as one wake

### Requirement: Per-agent rows and the change total report the wake count

Each per-agent table of a telemetry section SHALL carry a `Wakes` column with the number of wakes of the agent in the window of its section, and the change total SHALL add it. A run whose agents never armed a wait SHALL report zero wakes for each agent. A subagent session that is not recorded SHALL show the unavailable marker in `Wakes`, and a total that depends on it SHALL be marked partial (`≥`); a section written before the column existed SHALL count as unknown in the change total.

#### Scenario: agents that never armed a wait
- **WHEN** a run's coordinator and subagents never armed a wait
- **THEN** each agent row shows `0` in `Wakes`

#### Scenario: an unrecorded subagent session
- **WHEN** a dispatched subagent's session is not recorded
- **THEN** its `Wakes` cell shows the unavailable marker and the run total is marked `≥`

### Requirement: Each section reports the wake cost as a subset of its figures

Each execution section and each exploration segment SHALL end with a `Cache-warming wakes` table that lists, per agent and for the run or exploration total, the wakes and the requests, input, output, reasoning, cache read, cache write, and cost of every request of the wake turns, the re-arm and the wake or stop literal reply included. Wake requests SHALL stay inside the ordinary figures, so no existing total changes meaning. On Claude Code the reasoning column SHALL be unavailable, as in every Claude Code row, and the cost column SHALL be the estimate from the price table, marked `~`.

#### Scenario: wake requests stay inside the totals
- **WHEN** an agent spends two requests in one wake turn
- **THEN** the wake table shows one wake and two requests for the agent, and its ordinary `Requests` figure still includes those two requests

#### Scenario: an exploration segment lists its wakes
- **WHEN** a change with `explore_origin` records its exploration
- **THEN** the exploration segment ends with a `Cache-warming wakes` table whose last row is the exploration total

### Requirement: The wake figures are documented

`sai/policies/change-telemetry.md` and the change telemetry setting documentation SHALL describe the wake definition, the `Wakes` column, the wake-cost table, and that wake figures are a subset of the existing figures. They SHALL name the reply literals of `sai/policies/cache-warming.md` instead of a bare `ok`, and SHALL state that a stop literal answering a `dispose` message is never counted as a wake.

#### Scenario: the policy defines a wake
- **WHEN** a reader opens the `Cache-warming wakes` section of `sai/policies/change-telemetry.md`
- **THEN** it defines a wake from the wait command on both harnesses and states that a reply literal alone is not a wake

### Requirement: A cache miss is a request whose cached prefix shrank and had to be rewritten

A cache miss SHALL be a request after an agent's first whose cache read is smaller than the previous request's cache read plus cache write. The shortfall SHALL be the request's rewritten tokens. A request that only writes new tokens on top of a fully read prefix SHALL NOT be a miss, and a shrink caused by a context compaction SHALL count as a miss. An agent with a single request SHALL report zero misses. When a request or the request before it lacks a cache read or cache write figure, its miss, rewritten tokens, and overcost SHALL be unknown, never zero.

#### Scenario: a single-request agent has no cache miss
- **WHEN** an agent made exactly one request with cache read `0`
- **THEN** its cache misses are `0`

#### Scenario: a write on top of a fully read prefix is not a miss
- **WHEN** an agent's second request reads exactly the previous request's cache read plus cache write and writes new tokens
- **THEN** that request is not counted as a cache miss and adds no rewritten tokens

#### Scenario: a partial expiry is a miss
- **WHEN** an agent's previous request read 1,000 cached tokens and wrote 200, and its next request reads 400 cached tokens
- **THEN** that request counts as one cache miss with 800 rewritten tokens

### Requirement: Each cache miss carries its overcost from the price table

The overcost of a miss SHALL be its rewritten tokens × (cache write price − cache read price), in USD, from the price table `sai/tools/model-prices.js`, on both Claude Code and opencode. It SHALL use the write price of the lifetime the request recorded (5 minutes or 1 hour), and a cache write without the lifetime split, which includes the single opencode cache-write figure, SHALL be priced as the 5-minute write. A model with no price entry, or whose entry lacks a price the computation needs, SHALL have an unknown overcost, never zero. The `telemetry-totals` comment of each section SHALL store `rewritten` (tokens) and `overcost` (money) beside the existing figures.

#### Scenario: a miss is priced at the write price of its recorded lifetime
- **WHEN** a Claude Code miss rewrites tokens and its request recorded the cache write as a 1-hour write
- **THEN** its overcost uses the 1-hour write price minus the cache read price of the model's price entry

#### Scenario: an unsplit write pays the 5-minute price
- **WHEN** a miss's request records a cache write with no 5-minute and 1-hour split
- **THEN** its overcost uses the 5-minute write price

### Requirement: Every telemetry table reports the cache hit and the overcost per miss

Every table of `telemetry.md` that lists the metric columns SHALL carry a `Cache hit` column after `Cache write` and an `Overcost/miss` column after `Cache misses`. `Cache hit` SHALL be cache read ÷ (cache read + cache write + input), computed from summed tokens, and SHALL show `unavailable` with a zero denominator. `Overcost/miss` SHALL be total overcost ÷ total misses, computed at every level from the summed figures and never as an average of averages, and SHALL show `n/a` with no misses, which is different from `unavailable`. Both columns SHALL be derived when a table is rendered and SHALL never be stored.

#### Scenario: no miss shows n/a
- **WHEN** an agent's requests contain no cache miss
- **THEN** its `Overcost/miss` cell shows `n/a`

#### Scenario: no tokens makes the cache hit unavailable
- **WHEN** an agent's summed cache read, cache write, and input are all zero
- **THEN** its `Cache hit` cell shows `unavailable`

### Requirement: Sections written before the cache figures show them as unavailable

A section written before the `rewritten` and `overcost` figures existed SHALL keep its text unchanged. Its `Cache hit` and `Overcost/miss` SHALL be `unavailable`, and a total that adds it to newer executions SHALL be marked partial with `≥`.

#### Scenario: an older section makes the total partial
- **WHEN** the collector appends an execution to a `telemetry.md` whose earlier section has no `rewritten` or `overcost` in its `telemetry-totals` comment
- **THEN** the earlier section is unchanged, and the totals that add it up show the new figures as `unavailable` or marked `≥`

### Requirement: telemetry.md holds a By command section after the change total

`telemetry.md` SHALL hold a `## By command` section right after `## Change total`, with one row per command label of the execution headings (`## Execution N — <label> — <status>`, written without the leading slash), in order of first appearance. Each row SHALL add up every execution of that command in the change, show the execution count, and carry the same metric columns as the change total. The exploration SHALL be a separate last row, `sai-explore (exploration)`, whose count is the number of origin sessions, and it SHALL stay out of the change total. Every collection SHALL rebuild the section, with the change total, from the `telemetry-totals` comments of the execution sections and the exploration subsections.

#### Scenario: two executions of one command share a row
- **WHEN** a `telemetry.md` holds two `sai-plan` executions and one `sai-build` execution
- **THEN** the `## By command` section has a `sai-plan` row with execution count 2 and a `sai-build` row with execution count 1

#### Scenario: the exploration is its own row
- **WHEN** a change with `explore_origin` records its exploration
- **THEN** the `## By command` section ends with a `sai-explore (exploration)` row, and the change total does not include the exploration

### Requirement: The cache and cost figures are documented

`sai/policies/change-telemetry.md` SHALL describe the cache miss rule, the rewritten tokens, the overcost, `Overcost/miss`, `Cache hit`, the stored figures, the estimated Claude Code cost with its dated price table, the older sections, and the `By command` section. `docs/project-settings.md` and `openspec/schemas/sai-workflow/templates/telemetry.md` SHALL mention the new figures and the `By command` table.

#### Scenario: the policy defines the cache figures
- **WHEN** a reader opens `sai/policies/change-telemetry.md`
- **THEN** it has a `## Cache and cost` section that defines a cache miss, the overcost, `Overcost/miss`, and `Cache hit`, and a `## By command` section

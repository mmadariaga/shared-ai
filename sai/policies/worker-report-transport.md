# Worker Report Transport

Single source for how a routed worker returns its result and how its coordinator receives it: one closed report schema, one file-plus-hash transport, and one validator that decides whether a report is usable before the coordinator reads any field. It applies to the workers whose contract fetches it: the RED and GREEN workers of `/sai-3-implement`, the spec and design workers of the plan commands, the review worker of `/sai-4-review`, the audit workers of `/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility`, the commit, archive, backfill, and merge workers of `/sai-commit`, `/sai-archive`, `/sai-backfill`, and `/sai-merge`, and the implementation, backfill, and archive workers of the full Direct Build - Unattended route. The three budget agents (`budget-explorer`, `budget-subagent`, `budget-executor`) deliver through the same file-plus-hash transport under § Budget agents, with no schema and no validator. The initial `event: ready` return is unchanged for every worker. The `--no-specs` POC keeps its existing transport. Claude Code and opencode produce, validate, and recover reports identically.

Terms. **Report file**: the file a worker writes in the run's report directory, holding its complete message. **Report reference**: the report file's path plus its sha256, which the worker returns to its coordinator. **Outcome**: a field of a `completed` report that distinguishes successful results; the validator restricts it to the values each command admits. **Progress report**: a report file that carries `event: progress` instead of a terminal `status`; it tells the coordinator which plan steps the worker completed.

## Report schema

A report is YAML, closed to these shapes:

```yaml
status: completed|failed|cancelled
summary: string
changed_files: string[]
```

```yaml
status: needs_input
summary: string
changed_files: string[]
question: string
options: {label: string, value: string}[]
```

- A `completed` report may carry `outcome`. `worker-report-validator.js` is the single source of the values each command admits (`--command <name>`), so a coordinator decides on that field, never on summary text. A command that lists no value admits no `outcome`.
- A worker contract adds its own role fields to these shapes, listed per command in § Role fields. A role field never replaces a field above.
- A step that cannot finish reports `failed` with its reason in `summary`. The retired `done`, `blocked`, `step-done`, `question`, `notice`, and `conflict_detected` vocabularies are outside the schema, and a report that uses them is invalid.
- A `needs_input` question is shaped per `@sai/policies/question-context.md` at its source.

### Role fields

The validator closes each terminal report to its command's role fields (`COMMAND_FIELDS` in `sai/tools/worker-report-validator.js`, the single source this table mirrors; a test keeps the two in step). A key that is neither a base field above nor in the command's row is rejected, and so is a key of the other kind (`event` in a terminal report, `status` in a progress report). A field the table marks required must be present with its type on the statuses named; every other listed field is optional and typed when present. `--command` is mandatory for a terminal report.

| `--command` | Workers | Role fields | Shape |
|---|---|---|---|
| `implement` | RED, GREEN | `test_command`, `notes`, `plan_tests`, `modified_tests` | strings, both required on completed; the plan RED alone adds, on completed, `plan_tests` (a list of {step, test_command, tests: a list of {path, name, regression_guard}}) and `modified_tests` (a list of {path, reason} strings) |
| `spec` | spec | `step_ids`, `warnings`, `notes`, `research_files` | string list, list of {spec_assertion, other_side, disagreement} strings, string, list of {path, sha256} strings; all required on completed |
| `design` | design | `step_ids`, `warnings`, `notes` | the first three of spec |
| `review` | review | `review_path`, `counts`, `recommended_audits` | string, counts {critical, high, medium, low, questions}, string; all required on completed without outcome |
| `security` | security | `report_path`, `counts` | string, counts {critical, high, medium, low}; both required on completed |
| `performance` | performance | `report_path`, `counts` | string, counts {critical, high, medium, low, informational}; both required on completed |
| `accessibility` | accessibility | `report_path`, `counts` | as performance |
| `commit` | commit | none | no role field |
| `archive` | archive | `resolved_change_name`, `failure_class`, `unrecoverable` | string required on completed and needs_input; failure fields per § Direct Build role fields |
| `backfill` | backfill | `resolved_change_name`, `draft_references`, `corrected_specs`, `failure_class`, `unrecoverable` | optional string; list of {path, sha256, destination} and list of {destination, content}, completed only; failure fields per § Direct Build role fields |
| `merge` | merge | `strategy`, `decisions`, `escalations`, `analysis`, `corrections`, `applicability`, `renames`, `reference_updates`, `recipe` | all optional: the resolve step names decisions, escalations (and then strategy, with nothing written), and recipe, a list of {path, signature} on a completed report; the reuse step names decisions; test-correction and final-correction name analysis and corrections; renumbering-plan names applicability, renames, reference_updates, and escalations |
| `direct-build` | Direct Build implementer | `resolved_change_name`, `failure_class`, `unrecoverable` | optional string once the block has verified; failure fields per § Direct Build role fields |

A `completed` review report that carries `outcome: no-changes` owes no role field. The counts of a Not Applicable audit report are all zero. The batch `questions` form of `needs_input` does not exist: a `needs_input` report carries one `question` and its `options`, and the integer `counts.questions` of a review report is a count, not a question list.

### Progress reports

A worker whose plan has several steps may report the steps it completed between terminal reports. A progress report is YAML with exactly these fields, and it is never a terminal result:

```yaml
event: progress
step_ids: string[]
changed_files: string[]
```

- `step_ids` lists the plan ids the message completed, in plan order. `changed_files` follows the rule of the terminal report.
- The worker saves a progress report like any other report, and names its file with the prefix `progress-`. The coordinator reads the kind from that name, never from the content: a file named `progress-…` is a progress report (validated with `--kind progress`, or by the `emit --progress` reference mode below), and any other report is validated with `--kind terminal --command <command>`. A report whose content does not fit the kind its name announces is invalid.
- A progress report advances the worker's step machine without a separate validation call: the coordinator passes its reference to `sai-state emit <id> <machine> --progress --report-dir <report-dir> --report-file <path> --report-hash <sha256>`, which verifies the reference once (directory, containment, sha256), validates those same bytes with `--kind progress`, and derives the machine event from them. A report outside the directory or with a different hash is refused and the machine does not advance. `--input-file <report file>` and stdin stay accepted for a hand-composed payload and carry no hash check.

## Author boundary

The first task-disclosure line is `--report-dir <absolute path>`, supplied by the coordinator after ready. Strip it before parsing the invocation envelope (including backfill's `--transfer-dir` line), and retain it through all same-worker continuations. A coordinator may follow it with a second line, `--harness <claude|opencode>`, naming its own harness, whose SAI temp root holds the report directory: strip that line the same way, retain it, and pass its value as `--harness` to every `temp-root.js` or `transfer.js` call you make that takes one. Without the line, those tools infer the harness from the installed root you run from, as before. A task without the report directory cannot proceed; report the missing transport to the coordinator without work.

Compose the report of the worker's contract. Write its complete YAML or JSON unchanged with the native file-write tool to a unique file in the SAI temp root (for example `<report-dir>/<unique-role-and-stretch-name>.draft.json`), then save it with `transfer.js put --dir <report-dir> --path <unique-role-and-stretch-name>.json --exclusive --input-file <that file>`, resolving the helper per `@sai/policies/tool-resolution.md`. Each response, including `needs_input` and failures, uses a new file; previous reports remain available. `--exclusive` creates the file with an exclusive-create open, so a name that already exists fails and leaves the earlier report and its hash unchanged; a failed save is retried under a new name, never over the old one. Return only `{path, sha256}`, exactly as printed by `put`, plus the `warming: true|false` line of `@sai/policies/cache-warming.md` § Warming diagnostic beside it, never inside the saved file. A message that carries its result inline is an invalid report.

Messages outside the schema keep their current form: the `event: ready` handshake reply, the wake and stop literals of `@sai/policies/cache-warming.md`, and the `warming:` line beside the reference.

If report creation fails, return the transport error as evidence, not a substitute accepted lifecycle report. On a fresh-result request, recover the report of the already-performed work; perform no effects again. Corrections to an invalid report come from its author, never from coordinator transcription.

## Direct Build role fields

A `failed` report of a Direct Build, archive, or backfill worker that carries `resolved_change_name` also carries `failure_class` and `unrecoverable`, exactly:

```yaml
status: failed
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction|validation-failed|generation-error|dispatch-failed|envelope-contract-violation|unclassified-worker-fault
unrecoverable: boolean
```

`failure_class` is worker-authored evidence, not an eligibility gate: the coordinator decides what to do under `@sai/policies/obstacle-escalation.md`. Set `unrecoverable: true` only when your own evidence shows that continuing is unsafe. Neither field is ever written into a repository artifact. They are role fields of the workers that carry `resolved_change_name`, on every route they run, and no other worker carries them.

## Receiver boundary

Before the first task disclosure of the run, create one private report directory with `transfer.js open --harness <claude|opencode>`. Supply its returned `dir` as the first task-disclosure line `--report-dir <path>` to every worker of the run, and keep it as a path in the run state (`implement-run@1` for `/sai-3-implement`, `plan-run@1` for the plan commands, the conversation for `/sai-4-review`, the audit cycles, `/sai-commit`, `/sai-archive`, `/sai-backfill`, and `/sai-direct-build`, `direct-build-run@1` for Direct Build on the `/sai-explore` route, and `merge-run@1` for `/sai-merge`), so a replacement worker and a resumed run reuse it. Retain this authorized directory separately from draft storage, with all returned references and validation evidence. When the directory cannot be opened, stop before any dispatch with the verbatim error.

Task messages and step pointers from the coordinator to the worker stay inline.

For each terminal response after ready, run the **paired check**: the duplicate check of § Undelivered reports and the validation, as two independent calls issued together in one model response (a same-turn batch), because the model turn, not the call, is the cost driver. Resolve `transfer.js` and `worker-report-validator.js` per `@sai/policies/tool-resolution.md` and run:

```
node <tool-path> accept --check --dir <report-dir> --path <path> --sha256 <sha256>
node <tool-path> validate --kind terminal --command <command> --json --report-dir <report-dir> --report-file <path> --report-hash <sha256>
```

The coordinator reads no field of the report before it has both answers.

A reference path may be written relative to the report directory: `accept` and the validator resolve it against `--report-dir` before their checks, and the containment and hash checks are the same as for an absolute path, so a path that escapes the directory is refused. A report returned as `{path, sha256}` stays absolute; pass the value unchanged.

- **`already: true`.** Discard the validate result, spend no attempt, and send no continuation. The report is a repeat of one already dealt with.
- **Any other answer.** Handle the validate result by the rules below, invalid-report recovery included.
- **A call that comes back cancelled or without a result** (for example because its sibling call failed) is re-issued alone in the next turn. A cancellation is not an obstacle attempt, and a validate result is never acted on without the `--check` answer of the same reference.
- **Progress reports.** The paired check covers terminal reports only. A `progress-` report keeps `accept --check` and `sai-state emit … --progress` in sequence, because the emit advances the step machine and never runs speculatively.

`<command>` names the command whose role fields and outcome values close the report (`implement` for RED and GREEN; `spec` or `design` for the plan workers; `review` for the review worker; `security`, `performance`, or `accessibility` for the audit worker of that audit; `commit`, `archive`, `backfill`, or `merge` for the worker of that command, standalone or, for `archive` and `backfill`, in Direct Build; `direct-build` for the Direct Build implementer). A progress report that a step machine consumes goes straight to `sai-state emit … --progress` with the reference (§ Progress reports) and runs no `validate` call of its own; any other progress report runs `validate --kind progress --json --report-dir <report-dir> --report-file <path> --report-hash <sha256>` and takes no `--command`. A terminal report without `--command` is a usage error. Pass reference values only. The validator uses `transfer.js verify` to read once, check the hash, and validate those same bytes. It returns `outcome` as `accepted`, `delivery-failed`, or `report-invalid`; only acceptance includes the parsed `payload`, and the coordinator acts on that payload without another file read. Preserve the report bytes, including unsupported content; never copy them into a coordinator-authored shell command, normalize them, or silently fix them. A missing reference or helper failure is failed delivery, not a rejected report. A call that returns no response establishes neither acceptance nor rejection.

The coordinator validates every report before it reads any field. When the validator cannot be resolved per `@sai/policies/tool-resolution.md`, the run stops on that obstacle: it never interprets a report by reading it.

A report is invalid when its file is missing or unreadable, lies outside the report directory, does not match its sha256, carries a status outside the closed schema (or an `outcome` its command does not admit), carries a key outside its command's shape or a key of the other kind, lacks a required role field or gives one the wrong type, does not fit the kind its file name announces, or arrives inline instead of as a reference. A worker message that carries no reference at all and is not a protocol literal is an invalid report too, once the immediate scan of § Undelivered reports has found no unledgered report in its directory.

## Invalid reports

An invalid report is an obstacle of the step under `@sai/policies/obstacle-escalation.md`, with its budget of 3 attempts and no new budget:

- The first invalid report goes back to the same worker with the validator's errors (for a message with no reference, with the note that none arrived), as a request for a corrected report, or for the report of the work already done, that performs no work again.
- A second consecutive invalid report from that worker replaces it, per `@sai/policies/worker-lifecycle.md` § Dispose, with a hand-over the coordinator writes.
- Each of these counts as one attempt of the obstacle, and the exhausted budget escalates as that policy says.

## Undelivered reports

A worker's report can be on disk while its reference never reaches the coordinator: the completion notification is lost, or the worker's turn ends with a wake acknowledgement (`@sai/policies/cache-warming.md` § Wake acknowledgement) or a message such as "Ending this turn" instead of the reference. The coordinator recovers the report without reading it, and this section is the single source of how; a coordinator points here and does not restate it. A worker reply without a reference gets one immediate scan of the worker's report directory, and the watch covers a result that never arrives at all. It applies to every worker that reports through this policy, on Claude Code and opencode alike, whether cache warming is on or off. It covers the budget agents too (§ Budget agents), and it does not cover the `--no-specs` POC.

Terms. **Silent**: the end of a watch that reports `ended: silent`, when the worker produced no new file in the report directory and changed no file of the paths the coordinator listed for the whole silence window (`--silent-after`, 20 minutes by default). **Accepted reference**: a reference the coordinator has dealt with: validated and processed, or, for a report that failed validation, returned to its author as invalid. **Ledger**: the reserved file `.sai-accepted` in the report directory, the only memory of accepted references. **Watch**: the background `transfer.js watch` process of one report directory, a different thing from a cache-warming wait. **Protocol literal**: `event: ready`, or the wake literal, the stop literal, or the legacy alias of `@sai/policies/cache-warming.md` § Wake acknowledgement. **Unledgered report**: a report in the report directory that the `.sai-accepted` ledger does not list. **Scan**: one `transfer.js watch --dir <report-dir> --input-file <paths-file> --cwd <project-root> --settle 0s --max 1s` run in the foreground, the same writable-paths file as the watch of the worker task: it reports the unledgered reports at once or ends with an empty list after about a second.

- **Record.** After you have processed a reference, run `node <tool-path> accept --dir <report-dir> --path <path> --sha256 <sha256>` (`transfer.js`, resolved per `@sai/policies/tool-resolution.md`). The ledger lives in the report directory that your run state already keeps, so after a compaction or a resumed run a reference in the ledger is not processed again.
- **Duplicate.** For every reference, from the worker's message or from the watch, run the same call with `--check`. When it answers `already: true`, treat the reference like a wake acknowledgement: validate nothing, emit nothing, spend no attempt, send no continuation. A terminal report runs the check in the paired check of § Receiver boundary, which has already issued the validation, so its result is discarded; a progress report runs the check before the emit. A worker's wake can repeat its last result (`@sai/policies/cache-warming.md` § Wake), so a repeated reference is expected and costs nothing. One exception: a repeated reference that answers a message the coordinator sent is a rejected continuation, handled under `@sai/policies/worker-lifecycle.md` § Continuation timing, not a duplicate.
- **Watch.** Each time you start waiting for the result of a worker, launch `node <tool-path> watch --dir <report-dir> --input-file <paths-file> --cwd <project-root>` in the background (Claude Code `Bash` with `run_in_background: true` and the description `watch-reports`; opencode shell with `background: true`), whatever the warming setting. The process polls the directory itself, so no model turn runs while nothing happens. It exits with `reports`, the references of the reports in the directory that are not in the ledger and have settled, in creation order, with an empty list at its maximum, or with `ended: silent` (§ Silent). A file whose name contains `.draft.` is a draft, never a report.
  - **Writable paths.** `--input-file` is required: a watch without it exits 2 naming the flag and starts nothing, and the relaunch with the file spends no obstacle attempt. The file holds the paths the worker's brief lets it write, as a JSON array of strings (absolute, or relative to the project root) kept outside the report directory, such as one in the run's private temp directory; a worker's work shows there, so the watch counts a change below any of them as activity, beside the report directory. `[]` is valid when the report directory is the only place the worker writes. A listed path that does not exist yet counts from the moment it appears and is never an error. Every relaunch of a watch for the same worker task (after an empty end, after a first `silent`, and for a replacement worker) passes the same file. `--silent-after <minutes>` changes the window, which is 20 minutes on both harnesses; leave it unset unless the step needs a different one.
  - **Scratch folder.** A worker that can run a long command gets a scratch folder: a private folder in the run's temporary directory, outside the repository, that its brief names and the writable paths list. The worker streams the output of such a command into a log there (`@sai/policies/worker-lifecycle.md` § Worker side), so a running command counts as activity while one that prints nothing for a whole window still looks hung.
  - **Walk limit.** The watch reads at most 5000 entries below each listed path. A result that names paths in `walk_limited` tells you the walk of those paths stopped at that limit, so a `silent` end may have missed activity there: keep the paths narrow, and treat such a `silent` as the ordinary obstacle of § Silent, with that note in the question to the worker.
- **Found.** When the watch ends with reports, process each in creation order exactly as if the worker had delivered it: the duplicate check and the validation as the paired check of § Receiver boundary (a `progress-` report checks, then goes to the machine emit), the same invalid-report recovery with its obstacle attempt, then the record. A report that fails validation is recorded after you return it to its author, so the watch does not report it again.
- **Silent.** A watch that ends with `ended: silent` (its list is empty too, but this case comes first and the Empty case does not apply) found no new report and no activity for the whole window, which is how a hung worker looks from outside. It is an ordinary obstacle of the step under `@sai/policies/obstacle-escalation.md`, with its budget of 3 attempts and no new budget, and the user gets no question of its own: the first `silent` asks the same worker once for its report (a corrected instruction that asks for the result or the blocker and repeats no work) and launches the watch again; a second consecutive `silent` for that worker, with no report between them, replaces it per `@sai/policies/worker-lifecycle.md` § Dispose with a hand-over the coordinator writes. Each of the two is one attempt of the obstacle, and the exhausted budget escalates as that policy says. A report found, or a worker that answers the ask, ends the run of consecutive `silent` results. A worker that writes nothing for longer than two windows, such as one inside a very long command, is replaced: that cost is accepted, and the window is the flag above.
- **Empty.** When the watch ends with an empty list, launch it again. Send nothing to the worker and write nothing to the user.
- **Stop.** When the result you wait for arrives by any path, stop the watch (Claude Code `TaskStop`, opencode removal of its shell). A later firing finds nothing new and has no effect. Stop it too before you dispose the worker and close the report directory.
- **Protocol literals.** A worker message that is a protocol literal is not a result: keep waiting with the watch armed.
- **Reply without a reference.** A worker message that carries no report reference and is not a protocol literal, such as a translated or reworded literal, "Ending this turn", or text that carries its result inline, makes you act at once; waiting for a `silent` end of the watch is not the recovery. Run the scan on that worker's own report directory. A report it finds is processed exactly as in **Found**. When it finds none, the message is an invalid report under `## Invalid reports`: the first goes back to the same worker, asking for the report of the work already done, a second consecutive one replaces the worker, each spends one attempt, and the exhausted budget escalates with options. The watch of the step stays armed meanwhile, and a report that arrives by any path ends the run of consecutive invalid replies.
- **Parallel workers.** Watch each report directory separately and attribute a report to the worker of its directory.
- **No watch.** When the watch cannot be launched (no shell, permission refused), print one notice and go on without it: the run does not stop.
- **Wakes.** Follow `@sai/policies/cache-warming.md` for the main-session continuation check and the subagent protocol. Only the watch looks for undelivered reports; a warming notification does not trigger report polling.

## Budget agents

`budget-explorer`, `budget-subagent`, and `budget-executor` deliver every result as a saved report file and return only its reference, whoever dispatches them: an SAI coordinator, a worker that dispatches its own helpers, a main session in budget mode, or a plain session. There is no inline-text mode. A budget report follows the output contract of its task (the explorer's fields, the executor's per-command entries, the subagent's result shape) and has no closed schema: no `--command` row, no validator, and no `outcome`. The dispatcher's `transfer.js accept` is its only check. A worker's own report directory is never the dispatcher's helper directory, and the liveness guard and retired-handle record of `@sai/policies/worker-lifecycle.md` stay with workers.

### Agent side

A task opens with the line `--report-dir <absolute path>`, optionally followed by `--harness <claude|opencode>`: strip both, keep them for every later message, and pass the harness value as `--harness` to `transfer.js`. A dispatch with no task (a ready probe) needs neither line.

- **Missing line.** A task without `--report-dir` gets no work: reply with one line that names the missing line.
- **Save.** Compose the complete result of the task's output contract, write it unchanged with the native file-write tool to `<report-dir>/<unique-name>.draft.md`, then run `node <tool-path> put --dir <report-dir> --path <unique-name>.md --exclusive --input-file <draft>` (`transfer.js`, resolved per `@sai/policies/tool-resolution.md`). A name that already exists makes `put` fail and changes nothing: save under another name, never over the old file. Every response, a continuation included, is a new file under a new name.
- **Final message.** Run the arm check of `@sai/policies/cache-warming.md` first, so the final message follows your last tool call. It holds the `{path, sha256}` that `put` printed and then the `warming: true|false` line, and nothing else: no text before the reference, no excerpt or summary, and no wording that points at earlier text, such as "the report above". A wake's repeat of the last reference follows `@sai/policies/cache-warming.md` § Repeat the last result.
- **Failed save.** When `put` fails twice, reply with one line that names the failure and the path of the draft already written in the report directory. The result stays out of the message.

### Dispatcher side

- **Directory.** Create one helper report directory with `transfer.js open --harness <claude|opencode>` before the first budget dispatch, and send its `dir` as the first line `--report-dir <dir>` of every task message to a budget agent, continuations included. A Claude Code dispatcher whose agent runs in opencode (`harness: opencode`, `@sai/policies/opencode-dispatch.md`) adds `--harness claude` as the second line, for all three agents, so the report lands in the Claude Code SAI temp root. Parallel helpers share the directory, and each saves under its own name. A worker that dispatches helpers uses the helper directory its coordinator gives it, or creates and closes its own. A main session in budget mode outside an SAI command creates the directory at its first budget dispatch and reuses it while that agent stays alive.
- **Accept.** Run `node <tool-path> accept --dir <report-dir> --path <path> --sha256 <sha256>` on the reference before you read the report, and read the report only after it succeeds. `already: true` marks a reference you already accepted, such as a cache-warming repeat: treat the message as a wake acknowledgement, read nothing again, and spend no attempt. Exit 1 means the reference failed its check, and the message is undelivered.
- **Undelivered.** A message that carries no reference, text after the reference other than the `warming:` line, or a reference that `accept` refuses is an undelivered report, and a protocol literal is not one. Recover it at once as § Undelivered reports says, before asking anyone: run the scan on the helper directory and accept any saved report it lists. Only when it lists none, ask that agent once for the report of the work already done. A second failure is a failed helper dispatch of the step: the card's obstacle rules apply, and a plain session tells the user.
- **Watch.** While you wait for a helper's result, run the watch of § Undelivered reports on the helper directory, one per directory while any helper of it is outstanding, with `--input-file` holding `[]`. A report it lists is processed like one the agent delivered.
- **Close.** Close the directory with `transfer.js close --dir <dir>` once no live helper uses it and nobody else will read its files: at the run's close for an SAI run, and when you dispose the agent for a main session in budget mode. A directory whose reports pass to a later phase, the research directory of `/sai-plan` that design reads later, is closed by the agent that created it, at the end of its run.

## Recovery and lifetime

The goal is an accepted report of the work actually performed, with the ordinary step checks satisfied. Recover delivery or request a corrected report using the available evidence, as an obstacle under `@sai/policies/obstacle-escalation.md`. Choose an approach that can work; do not repeat a mechanism already shown to fail. Recoverable transport problems require no user instructions. Missing authority or facts needed for safe continuation require intervention.

Track delivery, report validity, and confirmed repository effects separately. Acceptance requires validation; an unaccepted report grants no status or changed-path claim. Independently confirmed archive moves and commits remain confirmed and consume their original authorization. A report-only correction or revalidation never resends an execute order. Stop at the existing exhausted budget, naming completed effects and unresolved checks rather than extending closing checks indefinitely or restarting completed operations.

Retain reports and draft evidence during validation, recovery, interruption, and an exhausted or otherwise unresolved close. Keep the references in retained execution state for same-conversation resumption. Close the report directory with `transfer.js close` only after accepted route closure and when no continuation or recovery needs it. Draft cleanup follows the same evidence retention condition. No timeout or additional mutation authority is introduced.

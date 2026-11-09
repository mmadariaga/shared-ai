# Worker Report Transport

Single source for how a routed worker returns its result and how its coordinator receives it: one closed report schema, one file-plus-hash transport, and one validator that decides whether a report is usable before the coordinator reads any field. It applies to the workers whose contract fetches it: the RED and GREEN workers of `/sai-3-implement`, the spec and design workers of the plan commands, the review worker of `/sai-4-review`, the audit workers of `/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility`, the commit, archive, backfill, and merge workers of `/sai-commit`, `/sai-archive`, `/sai-backfill`, and `/sai-merge`, and the implementation, backfill, and archive workers of the full Direct Build - Unattended route. The initial `event: ready` return is unchanged for every worker. The `--no-specs` POC keeps its existing transport. Claude Code and opencode produce, validate, and recover reports identically.

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
- A worker contract adds its own role fields to these shapes (RED and GREEN: `test_command` and `notes`; spec and design: `step_ids`, `warnings`, and `notes`; review: `review_path`, `counts`, and `recommended_audits`; audits: `report_path` and `counts`; commit: none; archive: `resolved_change_name`; backfill: `resolved_change_name`, `draft_references`, and `corrected_specs`; merge: the fields its step files name; Direct Build: `resolved_change_name` and the fields of § Direct Build role fields). A role field never replaces a field above.
- A step that cannot finish reports `failed` with its reason in `summary`. The retired `done`, `blocked`, `step-done`, `question`, `notice`, and `conflict_detected` vocabularies are outside the schema, and a report that uses them is invalid.
- A `needs_input` question is shaped per `@sai/policies/question-context.md` at its source.

### Progress reports

A worker whose plan has several steps may report the steps it completed between terminal reports. A progress report is YAML with exactly these fields, and it is never a terminal result:

```yaml
event: progress
step_ids: string[]
changed_files: string[]
```

- `step_ids` lists the plan ids the message completed, in plan order. `changed_files` follows the rule of the terminal report.
- The worker saves a progress report like any other report, and names its file with the prefix `progress-`. The coordinator reads the kind from that name, never from the content: a file named `progress-…` is validated with `--kind progress`, and any other report with `--kind terminal`. A report whose content does not fit the kind its name announces is invalid.
- An accepted progress report advances the worker's step machine: the coordinator passes the same report file to `sai-state emit <id> <machine> --progress --input-file <report file>`, which validates it again and derives the machine event itself.

## Author boundary

The first task-disclosure line is `--report-dir <absolute path>`, supplied by the coordinator after ready. Strip it before parsing the invocation envelope (including backfill's `--transfer-dir` line), and retain it through all same-worker continuations. A task without this directory cannot proceed; report the missing transport to the coordinator without work.

Compose the report of the worker's contract. Write its complete YAML or JSON unchanged with the native file-write tool to a unique file in the SAI temp root (for example `<report-dir>/<unique-role-and-stretch-name>.draft.json`), then save it with `transfer.js put --dir <report-dir> --path <unique-role-and-stretch-name>.json --input-file <that file>`, resolving the helper per `@sai/policies/tool-resolution.md`. Each response, including `needs_input` and failures, uses a new file; previous reports remain available. Return only `{path, sha256}`, exactly as printed by `put`, plus the `warming: true|false` line of `@sai/policies/cache-warming.md` § Warming diagnostic beside it, never inside the saved file. A message that carries its result inline is an invalid report.

Messages outside the schema keep their current form: the `event: ready` handshake reply, the wake `ok`, the `warming:` line beside the reference, and every `budget-*` helper result.

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

Before the first task disclosure of the run, create one private report directory with `transfer.js open --harness <claude|opencode>`. Supply its returned `dir` as the first task-disclosure line `--report-dir <path>` to every worker of the run, and keep it as a path in the run state (`implement-run@1` for `/sai-3-implement`, `plan-run@1` for the plan commands, the conversation for `/sai-4-review`, the audit cycles, `/sai-commit`, `/sai-archive`, `/sai-backfill`, and Direct Build, and `merge-run@1` for `/sai-merge`), so a replacement worker and a resumed run reuse it. Retain this authorized directory separately from draft storage, with all returned references and validation evidence. When the directory cannot be opened, stop before any dispatch with the verbatim error.

Task messages and step pointers from the coordinator to the worker stay inline.

For each response after ready, resolve `worker-report-validator.js` and run:

```
node <tool-path> validate --kind terminal --command <command> --json --report-dir <report-dir> --report-file <path> --report-hash <sha256>
```

`<command>` names the command whose outcome values the report may carry (`implement` for RED and GREEN; `spec` or `design` for the plan workers; `review` for the review worker; `security`, `performance`, or `accessibility` for the audit worker of that audit; `commit`, `archive`, `backfill`, or `merge` for the worker of that command, standalone or, for `archive` and `backfill`, in Direct Build; `direct-build` for the Direct Build implementer). A progress report runs `validate --kind progress --json --report-dir <report-dir> --report-file <path> --report-hash <sha256>` and takes no `--command`. Pass reference values only. The validator uses `transfer.js verify` to read once, check the hash, and validate those same bytes. It returns `outcome` as `accepted`, `delivery-failed`, or `report-invalid`; only acceptance includes the parsed `payload`, and the coordinator acts on that payload without another file read. Preserve the report bytes, including unsupported content; never copy them into a coordinator-authored shell command, normalize them, or silently fix them. A missing reference or helper failure is failed delivery, not a rejected report. A call that returns no response establishes neither acceptance nor rejection.

The coordinator validates every report before it reads any field. When the validator cannot be resolved per `@sai/policies/tool-resolution.md`, the run stops on that obstacle: it never interprets a report by reading it.

A report is invalid when its file is missing or unreadable, lies outside the report directory, does not match its sha256, carries a status outside the closed schema (or an `outcome` its command does not admit), does not fit the kind its file name announces, or arrives inline instead of as a reference.

## Invalid reports

An invalid report is an obstacle of the step under `@sai/policies/obstacle-escalation.md`, with its budget of 3 attempts and no new budget:

- The first invalid report goes back to the same worker with the validator's errors, as a request for a corrected report that performs no work again.
- A second consecutive invalid report from that worker replaces it, per `@sai/policies/worker-lifecycle.md` § Dispose, with a hand-over the coordinator writes.
- Each of these counts as one attempt of the obstacle, and the exhausted budget escalates as that policy says.

## Recovery and lifetime

The goal is an accepted report of the work actually performed, with the ordinary step checks satisfied. Recover delivery or request a corrected report using the available evidence, as an obstacle under `@sai/policies/obstacle-escalation.md`. Choose an approach that can work; do not repeat a mechanism already shown to fail. Recoverable transport problems require no user instructions. Missing authority or facts needed for safe continuation require intervention.

Track delivery, report validity, and confirmed repository effects separately. Acceptance requires validation; an unaccepted report grants no status or changed-path claim. Independently confirmed archive moves and commits remain confirmed and consume their original authorization. A report-only correction or revalidation never resends an execute order. Stop at the existing exhausted budget, naming completed effects and unresolved checks rather than extending closing checks indefinitely or restarting completed operations.

Retain reports and draft evidence during validation, recovery, interruption, and an exhausted or otherwise unresolved close. Keep the references in retained execution state for same-conversation resumption. Close the report directory with `transfer.js close` only after accepted route closure and when no continuation or recovery needs it. Draft cleanup follows the same evidence retention condition. No timeout or additional mutation authority is introduced.

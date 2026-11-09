# ADR 0214: Routed workers report through one validated file transport

<!-- adr-index: amends 0194 -->

## Status

Accepted. Amends ADR 0194: its consequence that the worker-report validator no longer gates the implement family's reports is reversed, and the validator gates them again. The rest of ADR 0194 stays in force.

## Context

Routed workers reported in several dialects. The RED and GREEN workers returned `done | blocked` with the path of a report file, other workers returned inline `step-done`, `question`, `notice`, or `conflict_detected` messages, and Direct Build returned a path plus hash reference. Only the Direct Build route and the merge tool validated a report before acting on it. Every other coordinator read the report and guessed when it was malformed, which let a silent failure through whenever a worker drifted from its own vocabulary.

ADR 0194 moved `/sai-3-implement` outside the shared orchestration and accepted, as a consequence, that the worker-report validator no longer gates that family's worker reports: the coordinator read each report and asked again when it was unreadable. That consequence is the gap this record closes for the first workers.

## Decision

1. **One closed report schema.** A report is YAML with `status` (`completed | needs_input | failed | cancelled`), `summary`, and `changed_files`. `needs_input` adds `question` and `options`. A `completed` report may carry an `outcome` that distinguishes successful results, restricted to the values the command admits (review admits `no-changes`; the implement and Direct Build commands admit none). Role fields (RED and GREEN: `test_command` and `notes`; Direct Build: `resolved_change_name`, `failure_class`, `unrecoverable`) extend the shape and never replace it. The `done`, `blocked`, `step-done`, `question`, `notice`, and `conflict_detected` vocabularies are outside the schema, and a step that cannot finish reports `failed` with its reason.
2. **One file-plus-hash transport.** A worker saves each report as a new file with `transfer.js put` in the report directory of the run and returns only the printed `{path, sha256}` reference with its `warming:` line. The coordinator opens that directory once per run with `transfer.js open`, sends it as the first task-disclosure line `--report-dir <path>`, and keeps it in its run state (`implement-run@1` for `/sai-3-implement`), so a replacement worker and a resumed run reuse it. A message that carries its result inline is an invalid report. The `event: ready` reply, the wake `ok`, the `warming:` line, and every `budget-*` helper result keep their form.
3. **The validator gates every report.** The coordinator runs `worker-report-validator.js validate --kind terminal --command <command> --json --report-dir --report-file --report-hash` before it reads any field and acts on the accepted payload without a second read. The tool is the single source of the per-command `outcome` table. When it cannot be resolved, the run stops on that obstacle and never interprets a report by reading it. The `notice` and `conflict_detected` kinds are retired; `terminal` and `progress` remain.
4. **Invalid reports reuse the existing recovery.** The first invalid report goes back to the same worker with the validator's errors, and a second consecutive invalid report from that worker replaces it. Each counts as one attempt of the obstacle, inside its budget of 3 attempts, and the exhausted budget escalates as before.
5. **RED and GREEN can ask.** A `needs_input` report from RED or GREEN is answered by the implement coordinator from the change's artifacts or the repository and recorded as a deviation; it escalates through the native picker only when nothing answers it and the answer would change the code.
6. **Scope of this change and single source.** The rules live in `sai/policies/worker-report-transport.md`, which replaces `sai/policies/direct-build-report-transport.md`. In this change they cover the RED and GREEN workers of `/sai-3-implement` and the full Direct Build workers. The other worker families (spec, design, review, the audits, commit, archive and backfill outside Direct Build, merge) keep their present dialect until their own slices.

## Alternatives Considered

- **A fresh validation budget separate from the obstacle budget of 3 attempts** — rejected: the existing recovery already covers an unusable report, and a second budget would add a rule to remember.
- **Replacing the worker at the first invalid report** — rejected: a single malformed report is usually a one-off slip that the validator's errors correct.
- **Matching the `no-changes` case on the exact summary literal** — rejected: coordinators would decide on text instead of a field, which is the failure this change removes.
- **A fourth terminal status `no-changes`** — rejected: the terminal statuses stay three plus `needs_input`, and `no-changes` is a `completed` result with a per-command `outcome`.
- **Keeping inline results for short messages** — rejected: two transports per worker would leave the validator unable to gate every report.
- **Leaving ADR 0194 unmentioned and letting design discover the contradiction** — rejected: the contradiction is a recorded consequence, so this record amends it explicitly.

## Consequences

- Each report costs one extra file write and one validation call; the tool-call cost is measured after implementation with `/sai-retrospective` against a baseline taken just before it.
- A replacement worker and a resumed run reuse the report directory, which the coordinator closes with `transfer.js close` only when the run completed.
- Every coordinator that adopts the policy needs the validator and `transfer.js open`, and its workers need `transfer.js put`; the shell grants of the existing profiles already cover them, and `worker-write` names the `put` call explicitly.
- `sai/policies/direct-build-report-transport.md` is retired and the installer removes the installed copy on both harnesses.
- The `notice` and `conflict_detected` validator kinds and their tests are gone; `sai-state emit --progress` and `merge.js` keep validating through the validator unchanged.
- The worker families outside this change keep their dialect, so the repository carries the old and the new report forms until their slices land.

## Provenance

Change `worker-report-protocol-implement`, decision "One transport (file plus sha256) for every worker" and decision "This change reverses the ADR 0194 consequence that the worker-report validator no longer gates the implement family's reports".

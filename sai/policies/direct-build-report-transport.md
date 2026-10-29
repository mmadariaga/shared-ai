# Direct Build Report Transport

Applies only to the full Direct Build - Unattended route in Claude Code and
opencode. The initial `event: ready` return is unchanged. The `--no-specs` POC
and standalone backfill and archive commands keep their existing transport.

## Author boundary

The first task-disclosure line is `--report-dir <absolute path>`, supplied by
the coordinator after ready. Strip it before parsing the invocation envelope
(including backfill's `--transfer-dir` line), and retain it through all
same-worker continuations. A full Direct Build task without this directory
cannot proceed; report the missing transport to the coordinator without work.

Compose the ordinary closed report of the worker's contract, including any
role-specific fields and the failure fields below. Save its complete JSON or
YAML unchanged with `transfer.js put --dir <report-dir> --path
<unique-role-and-stretch-name>.json` (report on standard input), resolving the helper per `@sai/policies/tool-resolution.md`. Each
response, including `needs_input` and failures, uses a new file; previous
reports remain available. Return only `{path, sha256}`, exactly as printed by
`put`, plus the `warming: true|false` line of `@sai/policies/cache-warming.md`
§ Warming declaration beside it, never inside the saved file. This reference replaces the inline report, not its lifecycle shape.
Draft references remain inside backfill's report and keep their own directory.

If report creation fails, return the transport error as evidence, not a
substitute accepted lifecycle report. On a fresh-result request, recover the
report of the already-performed work; perform no effects again. Corrections to
an invalid report come from its author, never from coordinator transcription.

## Failed reports

A `failed` report that carries `resolved_change_name` also carries
`failure_class` and `unrecoverable`, exactly:

```yaml
status: failed
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction|validation-failed|generation-error|dispatch-failed|envelope-contract-violation|unclassified-worker-fault
unrecoverable: boolean
```

`failure_class` is worker-authored evidence, not an eligibility gate: the
coordinator decides what to do under `@sai/policies/obstacle-escalation.md`.
Set `unrecoverable: true` only when your own evidence shows that continuing is
unsafe. Neither field is ever written into a repository artifact.

## Receiver boundary

Before full-route task disclosure, create one private report directory for the
slice with `transfer.js open --harness <claude|opencode>`. Supply its returned
`dir` via the outermost line above to each of the implementation, backfill,
and archive workers. Retain this authorized directory separately from draft
storage, with all returned references and validation evidence.

For each response after ready, resolve `worker-report-validator.js` and run:

```
node <tool-path> validate --kind terminal --json --report-dir <report-dir> --report-file <path> --report-hash <sha256>
```

Pass reference values only. The validator uses `transfer.js verify` to read
once, check the hash, and validate those same bytes. It returns `outcome` as
`accepted`, `delivery-failed`, or `report-invalid`; only acceptance includes
the parsed `payload` for ordinary lifecycle handling. Use that payload without
another file read. Preserve the report bytes, including unsupported content;
never copy them into a coordinator-authored shell command, normalize them,
or silently fix them. A missing reference or helper failure is failed delivery,
not a rejected report. A call that returns no response establishes neither
acceptance nor rejection.

## Recovery and lifetime

The goal is an accepted report of the work actually performed, with the
ordinary step checks satisfied. Recover delivery or request a corrected report
using the available evidence, as an obstacle under
`@sai/policies/obstacle-escalation.md`. Choose an approach that can work; do
not repeat a mechanism already shown to fail. Recoverable
transport problems require no user instructions. Missing authority or facts
needed for safe continuation require intervention.

Track delivery, report validity, and confirmed repository effects separately.
Acceptance requires validation; an unaccepted report grants no status or
changed-path claim. Independently confirmed archive moves and commits remain
confirmed and consume their original authorization. A report-only correction
or revalidation never resends an execute order. Stop at the existing exhausted
budget, naming completed effects and unresolved checks rather than extending
closing checks indefinitely or restarting completed operations.

Retain reports and draft evidence during validation, recovery, interruption,
and an exhausted or otherwise unresolved close. Keep the references in retained
execution state for same-conversation resumption. Close the report directory
with `transfer.js close` only after accepted route closure and when no
continuation or recovery needs it. Draft cleanup follows the same evidence
retention condition. No timeout or additional mutation authority is introduced.

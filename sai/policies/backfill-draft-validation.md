# Pre-write backfill draft validation

Applies equally to Claude Code and opencode, to standalone backfill and Direct
Build, including corrected drafts. Receiver-side validation is authoritative;
the worker's author checks are preliminary. Complete schema and preservation
checks first, then validate the entire latest draft set before any repository
write or execute authorization.

Resolve `validate-backfill-drafts.js` per `@sai/policies/tool-resolution.md`.
Run `node <tool-path> validate --harness <claude|opencode> --cwd <project-root>`
with JSON on standard input:

```json
{"change_name":"example","transfer_dir":"<absolute transfer directory>","draft_references":[{"path":"<absolute transfer file>","sha256":"<hash>","destination":"openspec/changes/example/proposal.md"}]}
```

The example shows the reference shape, not a complete set: pass every latest
reference, including `.openspec.yaml`, `proposal.md`, and every capability spec.
The tool verifies references and uses `temp-root.js` to build a private project
outside the repository. It copies the drafts, all current specifications at their
relative paths, and applicable project configuration and schemas. Unreadable or
unsafe inputs fail rather than becoming absent specifications. It invokes
`openspec validate <name> --type change --json --no-interactive` there; it does
not initialize or register a store, mutate the source project, or weaken the CLI.

Only exit 0 with `ok: true` accepts the set. Retain the returned `fingerprint`,
`project_dir`, diagnostic, and exact reference set as validation evidence. A CLI
rejection, unavailable CLI, incomplete output, failed copy, or changed input
authorizes no writes. Retain the diagnostic. For a rejection, incomplete output, failed copy, or changed input, return it to the same worker for correction under the owning obstacle budget and repeat all checks on the complete corrected set. Review-round exhaustion cannot accept failed validation.

When the tool cannot launch the CLI it returns `ok: false` with the distinct
`reason: openspec-cli-unavailable`, checked before the drafts so it wins even when
the drafts are also invalid. That reason is force majeure (an unavailable external
service, per `@sai/policies/obstacle-escalation.md`): the receiver escalates at
once, requests no new draft from the worker, and spends no `draft` attempt, because
correcting drafts cannot restore the executable. It writes nothing and keeps the
evidence. Standalone backfill and Direct Build behave the same.

Immediately before the first repository write, run
`node <tool-path> check --cwd <project-root> --fingerprint <accepted fingerprint>`
with that same JSON input. This re-verifies all references and fingerprints draft
bytes, the reference set, current specifications, configuration, and schemas.
A mismatch or incomplete check writes nothing: repeat receiver validation before
any write. In Direct Build, the receiver runs this check before authorizing each
execute/correction order and supplies the accepted fingerprint with the order;
the same worker runs it again before its first write. The fingerprint is evidence,
not an additional draft reference or repository artifact. Execution orders still
contain only the already validated draft references, plus this evidence.

Keep temporary projects and diagnostics while correction or recovery needs them.
At accepted closure, remove only those projects (each returned `project_dir`)
through `temp-root.js remove --harness <claude|opencode> --dir <project_dir>`,
following existing evidence-retention rules; a failed or escalated closure keeps
them as evidence. This check
does not replace spec/design CLI validation, independent pre-archive checks, or
`openspec archive` and its validation controls.

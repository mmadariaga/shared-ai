# ADR 0236: Keep transfer and sai-state call notes display-only

## Status

Accepted.

## Context

A harness shows a tool call as its raw command line, and opencode v2 exposes no separate description field: its shell schema has only the command, workdir, timeout, and background. A `transfer.js` or `sai-state` call is dominated by transfer directories, report paths, hashes, machine ids, and event identifiers, so a reviewer cannot tell what the call does without reconstructing its arguments. The same gap appears in a copied command, a shell log, and the transcript.

## Decision

1. **Both tools accept `--note <text>` and ignore it.** `transfer.js` declares it on all eleven subcommands (`open`, `put`, `verify`, `materialize`, `accept`, `watch`, `receive`, `status`, `retire-handle`, `live`, `close`). `sai-state` declares it on every verb (`spawn`, `emit`, `reset`, `block`, `close`), including every live form of `emit`: the flag form, `--input-file`, `--progress`, and `--document-file`/`--amend`.
2. **The note is display-only.** It changes no JSON response, ledger line, retired-handle record, machine state, report, event, report reference, or exit code, and it is never persisted.
3. **The convention has one source.** `sai/policies/tool-call-notes.md` states the form, the position immediately after the subcommand or verb, the one-line English character restrictions, the tolerance of absence, and the rule that prose-described calls carry the note too. `worker-report-transport.md`, `stage-machine.md`, and `tool-resolution.md` fetch it.
4. **The prompt surface and a test carry the convention.** Executable calls in `sai/commands/`, `sai/policies/`, `skills/`, `sai/orchestration/`, and `agents/` spell `node <transfer-path>` or `node <sai-state-path>` with the note right after the subcommand or verb. `test/tool-call-notes.test.js` fails when a spelled invocation lacks the note and ignores prose mentions, abbreviated code spans, and `--help` examples.
5. **Malformed use is a usage error, not tolerated absence.** A missing value, a repeated flag, or a value that starts with `--` is rejected. `transfer.js` already rejected repeats and unexpected positionals; `sai-state` rejects a `--note` value that starts with `--` and extra positionals on `spawn`, `reset`, `block`, and `close`, so an unquoted note cannot shift an id or a change name.

## Alternatives Considered

- **Echo the note in the JSON response** — rejected because it changes output shapes and adds no review value beyond the command line.
- **Persist the note in `.sai-accepted`** — rejected because it mixes human intent with the protocol's ledger memory.
- **Warn when the note is missing** — rejected because it adds noise and invites retries.
- **Extend every SAI tool at once** — rejected to keep the change small; the convention can extend later.
- **Use the shell tool's `description` parameter** — rejected because opencode v2.4.2 does not expose it; its schema has only command, workdir, timeout, and background, and `/sai-retrospective` indexes the command, not a description.
- **Rewrite prose-described calls as spelled invocations** — rejected because the policy rule already covers them and the rewrite would enlarge the diff.
- **Recognize abbreviated code spans in the test** — rejected because most of them name an operation in prose, so the test would produce false positives.
- **Let `--note` swallow a following flag** — rejected because consuming `--dir` as a note turns a clear usage error into a confusing missing-flag error.

## Consequences

- Every call pays a small token and command-line cost.
- The test enforces only spelled invocations; a prose-described call can still omit the note without a runtime failure.
- The prompt sweep touches many instruction lines and produces a large mechanical diff.
- `spawn`, `reset`, `block`, and `close` become stricter about extra positionals.
- Well-formed calls without the note keep working.
- The leading-`--` guard is limited to `--note`, so no other flag changes behavior.

## Provenance

Change `transfer-call-notes`, decision "Keep transfer and sai-state call notes display-only".

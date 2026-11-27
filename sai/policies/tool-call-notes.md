# Tool call notes

Single source for the `--note` note that every executed `transfer.js` and `sai-state` call carries, so a person who reads a harness's raw command line can tell what the call does. A harness shows a tool call as its command line, and a `transfer.js` or `sai-state` call is dominated by transfer directories, report paths, hashes, machine ids, and event identifiers. `@sai/policies/worker-report-transport.md`, `@sai/policies/stage-machine.md`, and `@sai/policies/tool-resolution.md` fetch this file, so every surface that loads one of them, workers and budget skills included, sees the rule.

## The note

Every executed call of these two tools carries one short note that names its action:

```
node <transfer-path> <subcommand> --note "<short English action label>" <other flags>
node <sai-state-path> <verb> --note "<short English action label>" <other flags>
```

- **Position.** The note comes immediately after the subcommand or the verb, before every other flag, separate and double-quoted. On `transfer.js` this keeps the per-subcommand permission rule (`node {sai}/tools/transfer.js <subcommand> *`) matching; a note placed before the subcommand does not.
- **Text.** One line of short English prose that names the action, for example `"open the report directory"` or `"emit the step result"`. It carries no report content, no secret, and no user data, and it holds no double quote, `$`, backtick, `;`, `&`, `|`, newline, or leading `--`.
- **Every call.** The note is accepted by every `transfer.js` subcommand (`open`, `put`, `verify`, `materialize`, `accept`, `watch`, `receive`, `status`, `retire-handle`, `live`, `close`) and by every `sai-state` verb (`spawn`, `emit`, `reset`, `block`, `close`), on every live form of `emit`: the flag form (`--set`, `--add`, `--set-path`), `--input-file`, `--progress`, and `--document-file`/`--amend`.
- **Display only.** The tools accept the note and ignore it. It changes no JSON response, ledger line, retired-handle record, machine state, report, event, report reference, or exit code, and it is never persisted.

## Tolerance and malformed use

A well-formed call without the note behaves exactly as it does today: it succeeds, with no error, no warning, and no retry. A missing note is never a failure.

Malformed use is a usage error: a missing value, a value that starts with `--`, a repeated `--note`, or an unquoted value that the shell splits into extra arguments. Only absence is tolerated.

## Prose-described calls

The rule covers every executed call, not only the calls an instruction spells as a command. When an instruction describes a call in words (for example, "emit `status` to `implement-run@1`"), the agent constructs it with the note all the same.

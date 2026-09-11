# Stage Machine — Common Operational Policy

Single source for stage-machine operations. Every command that mentions the
stage machine fetches this file and SHALL NOT restate its verbs, errors,
quoting, pointer, or degraded-mode contract inline. Per-machine event tables
(intents, stages, step maps, seeding shapes, routing modes) stay with their
owning command and are never copied here.

## What it is

The stage machine is a local per-chat CLI state store (`bin/sai-state.js`),
not an HTTP service. There is no port, no token, and no liveness model. One
session id may host several machines at once (a `stateByMachine` map); each
machine owns its own stage table, pointer routing, transition rules, and
persisted progression state.

State never travels the wire and is never written into the project. Each
session persists as a durable store in its own file under the system temp directory
(`sai-state/<id>.json`, directory mode `0700`, file mode `0600`, atomic
writes) and reloads automatically on each invocation. No state object and no
snapshot travel in either direction.

## Verbs

- **Spawn**: `sai-state spawn --key <stable-key>` initializes or locates the
  session for that key and returns `{id}`. The id is a deterministic UUIDv4
  derived from the key and may be reused across invocations with the same
  key. Derive the key from the harness session identifier (reuse-or-fresh).
  A missing `--key` is a usage error (exit 2).
- **Emit**: `sai-state emit <id> <machineId> <eventJson>` sends one JSON event
  object to one machine and returns the minimal wire outcome
  `{stage, next: {follow, hint}, rejected?, warnings?}`. No state is ever sent
  in a request. A missing argument is a usage error (exit 2); a machine
  rejection returns exit 0 with `rejected` set; a machine error returns
  exit 1 with `{error, next}`.
- **Close**: `sai-state close <id>` deletes the session file and returns
  `{closed: id}`. Reopening the same id afterwards starts from the initial
  state. Close the session when the run closes; there is no auto-retry.

Canonical example (the only full spelling; consuming commands name intents
without re-spelling the verbs):

```text
sai-state spawn --key <stable-key>
sai-state emit <id> explore-idea@1 '{"intent":"next-step"}'
sai-state close <id>
```

## machineId

Every emit names its machine as exactly `<name>@<version>` (for example
`explore-idea@1`). An omitted or mistyped `machineId` is a closed error and
nothing falls back to the first machine.

## Errors

Closed literals only: `INVALID_EVENT`, `UNKNOWN_MACHINE`, `VERSION_MISMATCH`.
`INVALID_EVENT` covers a missing `@version`, malformed JSON (very often a
quoting slip, see below), and a transition the machine rejects as
non-conforming. `UNKNOWN_MACHINE` covers an unknown base name;
`VERSION_MISMATCH` covers a known base with the wrong version. A `warnings`
array on a response (first value `SESSION_FILE_CORRUPT`) reports store
degradation inside that same response: treat the returned `stage` as
authoritative and surface the regression against the presentation hint.

A `rejected` field on an otherwise successful emit (for example an
intent-less advance or an already-running route) means the machine did not
advance: do not fetch a step file on your own; the owning command defines
the acknowledgement. An `error` response likewise fetches nothing.

## Quoting (Windows PowerShell)

`eventJson` is a single shell argument containing JSON with double quotes.
Always single-quote the whole payload and keep the JSON double quotes
verbatim:

```text
sai-state emit <id> explore-slice@1 '{"intent":"plan"}'
```

On Windows PowerShell single-quoted strings are literal, so the inner double
quotes survive untouched — this is the supported form. Never wrap the payload
in outer double quotes without escaping the inner ones; bare inner doubles
inside an outer-double-quoted argument split or mangle the payload and the
store answers `INVALID_EVENT`. When the harness must pass double-quoted
arguments (or when building the command programmatically), escape every inner
double quote (`\"`) or construct the argument via `JSON.stringify` and pass it
as exactly one argument.

## next.follow

`next.follow` is the step-loading contract. There is no file whitelist: after
a successful emit, fetch whatever `next.follow` names. If this chat's
conversation loaded-set already contains that path from a successful prior
load, skip the fetch and follow the already-loaded instructions; the store
does not track the loaded-set. Never parse `next.hint` to decide whether to
fetch. Consume the returned `stage` as the current stage; the response always
wins over any disposable presentation hint held for panel rendering.

A follow-load failure stops the run: show the error and wait for the user.
Guess no other file and never route the failure through worker Bounded
Recovery. An emit failure or `rejected` response stops the same way and
fetches nothing on its own.

## Degraded mode

When the store is unreachable or degraded, hold the current stage without
auto-advancing and ask the user for an explicit next step; the progression
continues in degraded mode without re-deriving the transition table in prose.
Version-mismatch and closed-session outcomes fall to this degraded path
rather than continuing against a mismatched machine. A command that declares
its own specialized store-failure fallback (for example a full-context inline
derivation) follows that fallback where stated; this section is the default
everywhere else.

## Scope boundary

Operations only. Stage tables, intent tokens, recorded-list shapes, seeding
shapes, routing modes, variant rules, parking rules, and replacement
re-resolution stay in the owning command. Consuming surfaces keep exactly
their own event table and a fetch line to this file.

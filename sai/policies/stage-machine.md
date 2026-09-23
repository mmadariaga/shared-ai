# Stage Machine — Common Operational Policy

Single source for `sai-state` operations: verbs, responses, event delivery,
corrective retry, `next.follow` loading, degraded mode, and linear
step-machine consumption.
Per-machine definitions (intents, stages, step files, seeding shapes, routing
modes) stay with the owning command, which keeps its own event table and a
fetch line to this file.

## The store

`bin/sai-state.js` is a local per-chat CLI store. One session id hosts several
machines (a `stateByMachine` map), each with its own stages, routing, and
progression. The session persists as a durable store in one file under the
system temp directory and reloads on every invocation; state never enters the
project and never travels in a request or a response.

A session file takes one writer at a time: run `emit` and `reset` calls against
the same session id one after another, even while workers run in parallel. The
meta-review audit batch emits in fixed order security → performance →
accessibility.

## Verbs

Resolve the CLI path per `@sai/policies/tool-resolution.md` § `bin/sai-state.js`
copy. Below, `sai-state <verb>` is shorthand for `node <tool-path> <verb>`; the
verbs take neither `--json` nor `--cwd`. A missing argument is a usage error
(exit 2).

- **Spawn**: `sai-state spawn --key <stable-key>` initializes or locates the
  session for that key and returns `{id}`. Derive the key from the harness
  session identifier; the same key always yields the same id.
- **Emit**: `sai-state emit <id> <machineId> -` reads one event as JSON from
  stdin, sends it to one machine, and returns
  `{stage, next: {follow, hint}, rejected?, warnings?}`. The `-` marker is the
  last argument; event JSON passed as an argument is a usage error (exit 2).
- **Reset**: `sai-state reset <id> <machineId>` clears that one machine's state
  and returns `{reset: <machineId>}`; other machines in the session keep theirs.
- **Close**: `sai-state close <id>` deletes the session file and returns
  `{closed: id}`; the same id then starts from the initial state. Close the
  session when the run closes.

`machineId` is exactly `<name>@<version>` (for example `explore-idea@1`).

Canonical example (the only full spelling; consuming commands name intents
without re-spelling the verbs):

```text
sai-state spawn --key <stable-key>
sai-state reset <id> review-standalone@1
echo '{"intent":"next-step"}' | node <tool-path> emit <id> explore-idea@1 -
sai-state close <id>
```

## Responses

A machine error exits 1 with `{error, next}` and one closed literal:

- `INVALID_EVENT`: a missing `@version` or a transition the machine rejects as
  non-conforming (a logic failure, no `reason`). When the event JSON read from
  stdin cannot be parsed (empty, truncated, trailing text, broken quotes), the
  response also carries `reason: "EVENT_UNPARSEABLE"` (a delivery failure) and
  no transition occurs.
- `UNKNOWN_MACHINE`: an unknown base name.
- `VERSION_MISMATCH`: a known base name with the wrong version.

A `rejected` field (exit 0) means the machine did not advance, for example an
intent-less advance or `ALREADY_RUNNING`: fetch nothing and give the
acknowledgement the owning command defines.

A `warnings` array (first value `SESSION_FILE_CORRUPT`) reports store
degradation inside that same response: treat the returned `stage` as
authoritative and surface the regression against the presentation hint.

## Event delivery

The event travels on stdin, never as an argument. The canonical example's
emit line is the full invocation, identical in bash, Windows PowerShell 5.1,
and PowerShell 7 on both Claude Code and opencode: the JSON in single quotes
with plain double quotes, echoed and piped to `emit <id> <machineId> -`.
Nothing is escaped.

The store strips a leading BOM and surrounding whitespace or line breaks
before parsing. Windows PowerShell 5.1 turns non-ASCII characters into `?` on
the pipe and the store accepts them as received, so events carry identifiers,
never free text: a `recordedList` holds only list ids (`"E1"`, `"E2"`, …,
`"I1"`, …, or the Step ids), because the machine reads only whether the list
is recorded or empty.

## Corrective retry

A delivery failure — `reason: "EVENT_UNPARSEABLE"` or an `emit` usage error
(exit 2) — gets up to 2 retries of that same emit without asking the user,
before any store failure is declared. Each retry corrects the delivery form to
the canonical example; repeating the same command is not a retry. When both
retries fail, stop and show the error per § next.follow. The counter belongs
to that one emit, not to the session, and the rule binds every emitter,
coordinators that declare a `step_machine` included. Every other emit error (a
logic failure, `UNKNOWN_MACHINE`, `VERSION_MISMATCH`, an unreachable or
degraded store) gets no retry.

## next.follow

`next.follow` is the step-loading contract. There is no file whitelist: after
a successful emit, fetch whatever `next.follow` names. If this chat's
conversation loaded-set already contains that path from a successful prior
load, skip the fetch and follow the already-loaded instructions; the store
does not track the loaded-set. Never parse `next.hint` to decide whether to
fetch. Consume the returned `stage` as the current stage; the response always
wins over any disposable presentation hint held for panel rendering.

A follow-load failure or an emit error stops the run, after § Corrective
retry for a delivery failure:
show the error and wait for the user. Guess no other file and
never route the failure through worker Bounded Recovery. An emit error here is
`INVALID_EVENT` or `UNKNOWN_MACHINE`; an unreachable store, `VERSION_MISMATCH`,
and a closed session follow § Degraded mode instead.

## Degraded mode

When the store is unreachable or degraded, hold the current stage without
auto-advancing and ask the user for an explicit next step; the progression
continues in degraded mode without re-deriving the transition table in prose.
Version-mismatch and closed-session outcomes fall to this degraded path
rather than continuing against a mismatched machine. A command that declares
its own store-failure fallback (for example apply's degraded-store fallback)
follows it instead. Coordinators that declare a `step_machine` never run
degraded: see § Step machines.

## Step machines

A coordinator whose adapter declares `step_machine: <name>@<version>` routes
its worker through a linear step machine: advance-only, routing-only, one
happy-path sequence of step files. The machine definition (step ids, step
files, stage table, initial state) is a data module in `sai-state/machines/`.

1. **Segment start**: `spawn`, then immediately `reset <id> <machineId>`.
2. **Each progress event**: emit `{"step_ids":[...]}` with the worker's
   reported completed ids in order (an empty list when it reported none).
   Include any initialization fields declared by the owning phase contract on
   the first emit after reset. The machine advances on declared new ids and
   ignores the rest. Send the returned `next.follow` in the two-line continuation of
   `sai/orchestration/command-runner.md` § Step-gated pointer delivery;
   `next.follow: none` is terminal and maps to its `Active step: none` line.
3. **Questions, feedback, and recovery** (`needs_input`,
   `continue_after_recovery`)
   do not invoke emit and do not consult the machine:
   the active step file persists across them, and the machine stays parked
   until the next progress event. A replacement worker re-resolves its
   active step from the surviving session's machine state without re-emitting.
4. **Run close** (`completed`, `failed`, `cancelled`): `reset <id> <machineId>`
   again, so a later run in the same chat starts at step zero.

A store failure (unreachable, `SESSION_FILE_CORRUPT`, version mismatch, or
unknown machine) stops the coordinator: surface the error with its context and
wait for user instructions. There is no degraded continuation, no static
pointer map, and no Bounded Recovery. A delivery failure first gets
§ Corrective retry.

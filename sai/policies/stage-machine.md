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
  session for that key and returns `{received_at, id}`. Derive the key from the harness
  session identifier; the same key always yields the same id.
- **Emit**: `sai-state emit <id> <machineId> -` reads one event as JSON from
  stdin, sends it to one machine, and returns
  `{received_at, stage, next: {follow, hint}, rejected?, warnings?}`. The `-` marker is the
  last argument; event JSON passed as an argument is a usage error (exit 2).
- **Progress emit**: `sai-state emit <id> <machineId> --progress [--with-overview true|false] -`
  reads one worker progress payload
  (`{event: "progress", step_ids, changed_files}`) as JSON from stdin instead
  of a hand-composed event. It validates the raw stdin text, unnormalized,
  through the worker-report validator module before any session, machine, or
  registry read,
  then derives the machine event `{"step_ids": [...]}` from the valid payload
  and advances the machine. It always returns an object carrying
  `received_at` and `validation: {ok, action, kind, errors}` — the same
  timeless verdict `worker-report-validator.js validate --kind progress` prints
  without its `received_at` — and, only on a
  valid verdict, the ordinary emit fields above. An invalid verdict never
  reaches the machine; non-JSON stdin is an invalid verdict, not
  `EVENT_UNPARSEABLE`. Exit 1 covers both an invalid verdict and a machine
  error: discriminate by `validation.ok`. `--with-overview` is accepted only on
  `design-standalone@1` and adds `withOverview` to the derived event; on any
  other machine it is a usage error (exit 2). A validator module found in
  neither location relative to the CLI exits 2 naming the tried paths and
  emits nothing. Every verb loads that module for `received_at`, so a missing
  validator exits 2 on every verb. Every stdout JSON response, machine errors
  (exit 1) included, carries `received_at` as its first key; stderr carries no
  time.
- **Block emit**: `sai-state emit <id> explore-slice@1 --ready-to-propose -`
  reads the complete `Ready to Propose` block set as text from stdin instead of
  a hand-composed event, in the style of the progress emit. It validates the
  set with the strict profile of `sai/tools/ready-to-propose.js` before any
  session, machine, or registry read; on a valid verdict it derives
  `{"recordedList": [...]}` from the extracted `**Change name**` values in
  display order and advances the machine. The set is validated as a whole: an
  invalid verdict records no name and leaves the machine untouched. It always
  returns `received_at` and `validation: {ok, profile, blocks: [{index, line,
  violations}], violations}` (change names stay off the wire), plus the
  ordinary emit fields on a valid verdict. An invalid verdict exits 1. Empty
  stdin, stdin with no block heading, or a final block cut off before its
  `---` line is a delivery failure instead (`INVALID_EVENT` with
  `reason: "EVENT_UNPARSEABLE"`, exit 1). On any other machine, or combined with
  `--progress` or `--with-overview`, the option is a usage error (exit 2). A
  detector module found in neither location relative to the CLI exits 2
  naming the tried paths.
- **Reset**: `sai-state reset <id> <machineId>` clears that one machine's state
  and returns `{received_at, reset: <machineId>}`; other machines in the session keep theirs.
  A linear step machine (§ Step machines) also returns
  `{stage, next: {follow, hint}}` for its first filed step, the first step
  whose `follow` is a file. Other machines return only `{received_at, reset}`.
- **Close**: `sai-state close <id>` deletes the session file and returns
  `{received_at, closed: id}`; the same id then starts from the initial state. Close the
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
emit line is the full invocation, identical in Bash and PowerShell 7 (the
shells `@sai/policies/command-execution.md` supports) on both Claude Code and
opencode: the JSON in single quotes
with plain double quotes, echoed and piped to `emit <id> <machineId> -`.
Nothing is escaped.

The store strips a leading BOM and surrounding whitespace or line breaks
before parsing. A shell pipe may re-encode non-ASCII characters and the store
accepts them as received, so events carry identifiers,
never free text: a `recordedList` holds only list ids (`"E1"`, `"E2"`, …,
`"I1"`, …, or the Step ids), because the machine reads only whether the list
is recorded or empty. `explore-slice@1` is the one exception: its
`recordedList` carries `**Change name**` values, which are kebab-case ASCII
identifiers, because that machine tracks slices by name. Route events carry no
slice name; the machine always chooses the first pending entry in that ordered
inventory.

**Block emits are the one exception.** The block emit carries the free-text
block set, so it travels as literal text, not as single-quoted JSON: a quoted
heredoc in Bash, a single-quoted here-string in PowerShell, on both Claude Code
and opencode. Nothing inside is expanded or escaped. Send the set exactly as it
will be displayed:

```text
node <tool-path> emit <id> explore-slice@1 --ready-to-propose - <<'SAI_BLOCKS'
<block set>
SAI_BLOCKS
```

```text
@'
<block set>
'@ | node <tool-path> emit <id> explore-slice@1 --ready-to-propose -
```

The PowerShell closing `'@` starts its own line. A re-encoded non-ASCII
character in the prose does not change the verdict: the labels are English and
the change names are kebab-case ASCII. An empty or cut-off delivery returns
`EVENT_UNPARSEABLE` and falls under § Corrective retry; a validation failure
does not, and follows the retry rule of the command that sends the block set.

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

The literal `none` is a no-file sentinel, not a path: do not fetch it. The
owning command defines the no-follow behavior; a `none` pointer does not by
itself authorize a route, dispatch, or turn close.

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
   Retain the returned `stage` and `next`: they name the first filed step. The
   first step of every step machine is fileless (`follow: none`), so its
   progress event would only relay that pointer. Instead, send the pointer
   line `Active step: <stage> — follow <next.follow>` as the first line of the
   post-ready task-disclosure continuation, before the task. The worker runs
   the fileless first step inline, follows that pointer, and reports both ids
   in its first progress event. The first emit after reset therefore normally
   carries two ids; when it carries only the first, the machine returns the
   same pointer again, with no error. This rule is phase-neutral: it applies
   to every coordinator or supervising surface that declares a `step_machine`,
   with no per-phase exception.
2. **Each progress event**: pipe the worker's progress payload, as received,
   into the progress emit (`sai-state emit <id> <machineId> --progress -`); it
   validates the payload and advances the machine in one call, deriving
   `{"step_ids":[...]}` from the worker's reported completed ids in order (an
   empty list when it reported none). Do not hand-compose event JSON. Pass any
   initialization option declared by the owning phase contract on the first
   emit after reset. An invalid `validation` block is a malformed payload,
   handled per `sai/orchestration/command-runner.md` § Validation; the machine
   is untouched. The machine advances on declared new ids and
   ignores the rest. Send the returned `next.follow` in the two-line continuation of
   `sai/orchestration/command-runner.md` § Step-gated pointer delivery;
   `next.follow: none` is terminal and maps to its `Active step: none` line.
3. **Questions, feedback, and recovery** (`needs_input`,
   `continue_after_recovery`)
   do not invoke emit and do not consult the machine:
   the active step file persists across them, and the machine stays parked
   until the next progress event. A replacement worker re-resolves its
   active step from the surviving session's machine state without re-emitting.
   Before the first progress event, that active step is the first filed step
   from the `reset` response, so the replacement's first continuation carries
   its pointer line, never the fileless first step's `none`.
4. **Run close** (`completed`, `failed`, `cancelled`): `reset <id> <machineId>`
   again, so a later run in the same chat starts at step zero.

A store failure (unreachable, `SESSION_FILE_CORRUPT`, version mismatch, or
unknown machine) stops the coordinator: surface the error with its context and
wait for user instructions. A progress emit that hits a store failure still
returns its valid `validation` block unaltered. There is no degraded
continuation, no static pointer map, and no Bounded Recovery. A delivery
failure first gets § Corrective retry.

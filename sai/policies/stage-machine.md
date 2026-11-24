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
SAI temp root of the harness and reloads on every invocation; state never enters the
project and never travels in a request or a response.

A session file takes one writer at a time: run `emit` and `reset` calls against
the same session id one after another, even while workers run in parallel. The
deep-review audit batch emits in fixed order security → performance →
accessibility. The file carries an integer `revision` that every write raises
by one (a file without one counts as 0). Each verb remembers the revision it
read, reads the file's revision again just before it replaces the file, and
writes nothing when the two differ (`STORE_CONFLICT`, § Responses): a crossed
write is reported, never silently lost. The check detects a crossed write and
does not lock; a very small window between the second read and the replacement
remains. An unparseable session file is never overwritten: the verb that reads
it renames it to `<session-file>.corrupt` (a numeric suffix, `.corrupt.1`,
`.corrupt.2`, keeps an earlier copy when that name is taken) and continues from
the initial state.

## Verbs

Resolve the CLI path per `@sai/policies/tool-resolution.md` § `bin/sai-state.js`
copy. Below, `sai-state <verb>` is shorthand for `node <tool-path> <verb>`; the
verbs take neither `--json` nor `--cwd`. A missing argument is a usage error
(exit 2).

- **Spawn**: `sai-state spawn --key <stable-key>` initializes or locates the
  session for that key and returns `{received_at, id}`. Derive the key from the harness
  session identifier; the same key always yields the same id.
- **Emit**: `sai-state emit <id> <machineId> --set <field>=<id> ...` builds one
  identifier event from flags (§ Event delivery), sends it to one machine, and
  returns
  `{received_at, stage, next: {follow, hint}, rejected?, warnings?}`. The flags:
  `--set <field>=<id>` sets one value, repeatable `--add <field>=<id>` appends to
  a list, `--add <field>=` records an empty list, and `--set-path <field>="<path>"`
  sets a path. A field name starts with a letter followed by letters, digits, or
  `_`; a `--set` or `--add` value matches the `ID_PATTERN` of
  `sai-state/machines/run-core.js`; a `--set-path` value holds no `"`, `$`,
  backtick, or control character. A violation, a field named twice by `--set`
  or by both `--set` and `--add`, or a flag combined with `--input-file`, stdin
  `-`, `--progress`, or `--document-file` is a usage error (exit 2) that
  changes no state; a rejected path names `--input-file` as the alternative.
  `sai-state emit <id> <machineId> --input-file <path>` reads one event as JSON
  from the input file instead, for an event that holds free text or a path the
  flags reject. The stdin form `emit <id> <machineId> -` stays accepted, so
  older instructions keep working; event JSON passed as an argument is a usage
  error (exit 2). A missing, unreadable, or empty input file exits 2 naming the
  path and changes no state.
- **Progress emit**: `sai-state emit <id> <machineId> --progress --report-dir <dir> --report-file <path> --report-hash <sha256>`
  takes the worker's progress report as a reference: it verifies the reference
  once (directory, containment, symbolic links, sha256), validates those same
  bytes, and advances the machine from them, so a report outside the directory
  or with a different hash is refused (`validation.outcome` `delivery-failed`)
  and the machine does not advance; the coordinator runs no separate
  `validate`. `sai-state emit <id> <machineId> --progress --input-file <path>`
  reads one worker progress payload
  (`{event: "progress", step_ids, changed_files}`) as JSON from the input file
  (or from stdin with `-`) instead
  of a hand-composed event. It validates the raw input text, unnormalized,
  through the worker-report validator module before any session, machine, or
  registry read,
  then derives the machine event `{"step_ids": [...]}` from the valid payload
  and advances the machine. It always returns an object carrying
  `received_at` and `validation: {ok, action, kind, errors}` (the reference mode
  adds `outcome`) — the same timeless verdict
  `worker-report-validator.js validate --kind progress` prints
  without its `received_at` — and, only on a
  valid verdict, the ordinary emit fields above. An invalid verdict never
  reaches the machine; non-JSON input is an invalid verdict, not
  `EVENT_UNPARSEABLE`. Exit 1 covers both an invalid verdict and a machine
  error: discriminate by `validation.ok`. A validator module found in
  neither location relative to the CLI exits 2 naming the tried paths and
  emits nothing. Only the progress emit and the document emit load that module;
  `spawn`, `reset`, `close`, `block`, and an identifier-event `emit` run without
  it. Every verb takes `received_at` from its own clock module
  (`sai/tools/received-at.js`, the single source the validator also uses), and a
  clock module found in neither location exits 2 naming the tried paths. Every
  stdout JSON response, machine errors (exit 1) included, carries `received_at`
  as its first key; stderr carries no time.
- **Document emit**: `sai-state emit <id> explore-slice@1 --document-file <path> [--verdicts-file <path>] [--document-file <path> [--verdicts-file <path>] ...]`
  reads the complete set of change documents, one file per document in display
  order, and the bounded-judgment verdicts of each document
  (`@sai/policies/block-hygiene-judgment.md`) as a JSON array from the
  `--verdicts-file` that follows it (`[]`, or no verdicts file, when no line is
  flagged), instead of a hand-composed event. Every file is prepared per
  `@sai/policies/issue-format.md` § Change document (Transport). It
  validates the set with `sai/tools/change-document.js` before any session,
  machine, or registry read: each document is checked as one change document
  (as a member of a slice set when there are several) and the set is checked as
  a whole (unique change names, every out-of-scope `I#` in scope of a
  document, `Depends on:` names inside the set and acyclic). The set is
  dispatchable when it is structurally valid and every line the lexical
  pre-filter flagged carries a `context` verdict. On a dispatchable verdict it
  derives `{"recordedList": [...]}` from the `Change name:` values in
  dependency order, advances the machine, and stores in the session file, per
  change name, each document's text, its sha256 hash, and the verdicts of its
  flagged lines, in the same session-file write as the inventory; a later
  successful document emit replaces the stored documents together with the
  inventory, except that a slice whose document hash equals the stored one keeps
  its completion and its parked cursor, and the publication answer stays when the
  set of change names is unchanged (the CLI hands the machine the names whose
  hash is unchanged as `unchanged`). A successful document emit also empties the
  `staleBlocks` list of § Explore movement. The inventory, the document texts,
  their hashes, and their verdicts are one session-file write: when it fails the
  response is the `STORE_WRITE_FAILED` (or `STORE_CONFLICT`) error of § Responses,
  and the earlier inventory and documents stay intact. The set is validated as
  a whole: a structural violation, a repeated change name, a `Depends on:` that
  names a change outside the set or forms a cycle, a flagged line without a
  verdict, or a `violation` verdict records nothing and leaves the machine
  untouched. It always returns `received_at` and `validation: {ok,
  structural_ok, profile, documents: [{index, violations, flagged}], violations,
  flagged, judgment: {ok, pending, violations, unknown, invalid}}` (change names
  stay off the wire; `ok` is true only for a dispatchable set), plus the ordinary
  emit fields and the dependency `order` on a dispatchable verdict. A
  non-dispatchable verdict exits 1; `judgment.pending` lists the lines awaiting
  a verdict. A file that is not one change document (no `# <title>` first line,
  or a second document), an unreadable file, or an unparseable verdicts file is
  a delivery failure instead (`INVALID_EVENT` with `reason: "EVENT_UNPARSEABLE"`
  or `"DOCUMENT_READ_FAILED"`, exit 1). A change document is a retired
  format: it answers `reason: "RETIRED_FORMAT"` (exit 1), is rejected, and is
  never converted; the retired `--ready-to-propose` and `--document-file` forms
  are a usage error (exit 2). A dispatchable set is accepted only while
  `explore-idea@1` in the same session is at its `crystallize` stage (an absent
  state counts as `explore-change`); at any other stage nothing is recorded and
  the response is `INVALID_EVENT` with `reason: "STAGE_NOT_CRYSTALLIZE"`, the
  found `stage`, and the `explore-idea@1` pointer (exit 1). `--amend` is outside
  this check. On any other machine, or combined with `--progress`, the option is
  a usage error (exit 2). A document tool or validator module found in neither
  location relative to the CLI exits 2 naming the tried paths.
- **Document amend**: `sai-state emit <id> explore-slice@1 --amend <change-name> --document-file <path> [--verdicts-file <path>]`
  reads exactly one change document from the file, in the document emit's
  delivery form and with the same verdicts file. It validates the document
  exactly as the document emit does, then requires its `Change name:` to equal
  `<change-name>` (`INVALID_EVENT` with `reason: "AMEND_NAME_MISMATCH"`, exit 1)
  and the call to carry one document (`reason: "AMEND_DOCUMENT_COUNT"`, exit 1).
  `explore-slice@1` then accepts the amendment for a pending, stopped, or
  running slice: a slice that is completed (`rejected: "SLICE_COMPLETED"`) or not
  in the recorded inventory (`rejected: "UNKNOWN_SLICE"`) is rejected with exit 0
  and nothing stored. An accepted amendment replaces only that slice's stored
  text, hash, and verdicts in the session file; the inventory order, the other
  slices' stored entries, and the completed slices stay unchanged. The CLI
  compares the stored and the new document field by field
  (`change-document.js compare`) and answers `amend_kind`: `metadata` when only
  the `Backlog origin:` or `Explore origin:` lines of `## Change` changed,
  `content` otherwise. A `metadata` amendment keeps the route authorization: a
  running slice is amended in place and a parked cursor stays. A `content`
  amendment voids it: the slice returns to pending without a cursor (a running
  slice is released) and the route gate closes, so the route selector is
  presented again. An accepted amendment removes its slice from the
  `staleBlocks` list of § Explore movement. It returns the document emit's
  `validation`, the `amend_kind`, plus the ordinary emit fields. The replacement
  is written together with the machine outcome in one session-file write, so a
  store failure (§ Responses) leaves the previous entry stored. A
  non-dispatchable document returns `validation` alone, exits 1, and replaces
  nothing. The option is accepted only with `--document-file` on
  `explore-slice@1`; otherwise it is a usage error (exit 2).
  Both registration and amendment use the `--document-file <path> [--verdicts-file <path>]` form on both harnesses, with no content through a shell command; the per-line `validation` of a document comes from `change-document.js check --document-file <path>` (`@sai/policies/issue-format.md` § Change document (Transport)).
- **Block**: `sai-state block <id> <change-name>` returns
  `{received_at, hash, text}` for one recorded slice: the exact validated change
  document text and its sha256 hash as the document emit (or the latest
  amendment) stored them. When the session, the stored documents, or that change
  name is absent it returns `{received_at, error: "BLOCK_NOT_FOUND"}` and exits 1,
  with no text. Plan and Direct Build dispatches, and every later reading of a
  slice's document by an Explore route, take document text only from this verb,
  never from conversation. The receiving worker runs `verify-file` on the
  exported `document_file` (`@sai/policies/issue-format.md` § Change document
  (Transport)). For worker delivery use `sai-state block <id> <change-name> --export --harness <claude|opencode>` instead: it checks the stored hash and writes the text directly through `transfer.js` into a private file. It returns `{received_at, hash, document_file, transfer_dir}` without text. An export failure returns `BLOCK_EXPORT_FAILED` and its reason (exit 1); a missing document still returns `BLOCK_NOT_FOUND`. The harness is mandatory for export (exit 2 on omission or invalid value). Refresh and retain these references per the change document transport policy.
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
sai-state reset <id> security-steps@1
node <tool-path> emit <id> explore-idea@1 --set intent=next-step
sai-state close <id>
```

## Explore movement

The explore machines guard invariants, not paths: the stage order is a default
path, and one `goto` intent moves a machine to any stage or step whose
preconditions hold. Both machines record every accepted move as
`{target, reason, received_at}` in a `moves` list of their state, exposed as
`run.moves` on every response, which the closing report lists; a rejected `goto`
changes nothing and records nothing. `received_at` is the CLI's reception time of
the response.

- **`explore-idea@1` `goto`**: `--set intent=goto --set target=<stage> --set reason=<user-request|correction>`
  with the target `explore-change`, `review-edge-cases`, `implementation-details`, or
  `crystallize`. Each machine declares its per-stage preconditions as data (the
  sections that must be `agreed`). A backward move is always accepted and keeps
  every section's state; a forward move stops at `crystallize`, the ceiling, and
  fails with `rejected: "MISSING_PRECONDITIONS"`, `missing` (each absent section)
  and `resume_at` (the earliest stage that owns one), the state unchanged. Other
  rejections: `GOTO_PAST_CEILING` (a route start or route step), `GOTO_UNKNOWN_TARGET`,
  `GOTO_ALREADY_AT_TARGET`, `GOTO_REASON_INVALID`.
- **Sections**: the machine stores, per stage section (`explore-change`,
  `review-edge-cases`, `implementation-details`), its state `agreed` or `open` and its
  source `issue` or `conversation`, next to the identifier lists; free text never
  enters the store. The section event `{"sections": {"<stage>": {"state", "source"?, "list"?}}}`
  records them without moving the stage (an input file, § Event delivery): `list`
  holds identifiers only and becomes the stage's starting list. An invalid event
  answers `rejected: "SECTIONS_INVALID"` and changes nothing. `next-step` and an
  accepted `recordedList` confirmation agree the section of the stage they close;
  recording a list that differs from the stored one reopens its section, and a
  changed `explore-change` list reopens every later section keeping its content;
  `next-step` skips every stage whose section is still `agreed`, except when it
  leaves the POC lane. The retired `issue-shortcut` intent is an unknown intent.
- **`explore-slice@1` `goto`**: `--set intent=goto --set target=<pending|step> --set reason=<user-request|correction>`
  with an optional `--set slice=<name>` (default: the active, else the first
  pending slice) and `--set reopen=true`. The target `pending` discards the slice's
  cursor (releasing it when running) and closes the route gate; a step target
  rewinds a running or parked slice to an earlier step of its own route. A Direct
  Build slice reaches its first step, and a later step only when the store holds its
  run state (§ Direct Build run state): otherwise `rejected: "MISSING_PRECONDITIONS"`
  with `missing: ["run-state"]` and `resume_at: "build-implement"`, and
  `GOTO_ORDER_UNCERTAIN` or `GOTO_ORDER_CONSUMED` while the rewind would replay an
  execute order whose effect is uncertain or renew a consumed archive order or
  commit grant. A Plan slice reaches any earlier step. A route start or a later step is
  `GOTO_PAST_CEILING`. A completed slice is `SLICE_COMPLETED` unless the user asked
  to reopen it (`reopen=true`, reason `user-request`, target `pending`).
- **Direct Build run state**: `direct-build-run@1`, on the shared run core, lives in the
  explore session beside `explore-slice@1` and holds the identifiers and paths of one
  slice's Direct Build run (`sai/commands/explore/direct-build-coordinator.md` § Run
  state names its events). Its `checkpoint` of a route item (`build-implement`,
  `backfill`, `archive`) is accepted only when the state that item needs is stored, and
  a `goto` to a later item is accepted only for a checkpointed one; an accepted rewind
  cuts the later checkpoints in the same session-file write. The run state follows the
  slice cursor: `goto` to `pending`, a `content` amendment, a reopened slice, and a
  re-registration that drops the slice's cursor discard it, a metadata amendment, `fail`,
  `cancel`, and `resume-direct-build` keep it, a Direct Build slice that starts fresh
  clears every earlier one, and `sai-state reset <id> direct-build-run@1` (run beside
  the explore resets at each `/sai-explore` invocation) clears it all. `/sai-direct-build`
  writes none of it, and a failed store write leaves the run state in the conversation.
- **Stale blocks**: an accepted backward `goto` of `explore-idea@1` from
  `crystallize` after blocks were registered lists every stored change name in
  `staleBlocks` in the session file. While any name is listed the route intents of
  `explore-slice@1` (`route-choice`, `direct-build`, `plan`, `auto-continue`,
  `resume-direct-build`) answer `rejected: "BLOCKS_STALE"` and change nothing. An
  accepted amendment removes only its own name; a document emit (re-registration)
  empties the list. The lock opens only when every stored document was amended or
  the set was registered again.

## Explore pause and close

`explore-idea@1` also records the life of the exploration, apart from its stage, as
`exploration`: `active`, `paused`, or `closed`. Every response carries it as
`run.exploration`. The leave rule that decides when to emit these intents lives in
`sai/commands/explore/instructions.md` (rule 4); the machine only guards them.

- **`pause`** (`--set intent=pause`): `exploration` becomes `paused`. Every stage,
  section, list, and move stays as it is, and so do the stored documents and the slice
  inventory of `explore-slice@1`.
- **`resume`** (`--set intent=resume`): a paused exploration becomes `active` at the
  stage it was paused in. Any other exploration answers `rejected: "NOT_PAUSED"` (an
  active one) or `rejected: "EXPLORATION_CLOSED"` and changes nothing.
- **`close-explore`** (`--set intent=close-explore`): `exploration` becomes `closed`
  and the stage, sections, lists, and moves return to their initial values. The
  session file stays, so the mark survives a context compaction. Only
  `sai-state reset <id> explore-idea@1`, which every new `/sai-explore` invocation
  runs, leaves `closed`. Close concerns `explore-idea@1` alone; the command card
  that closes an exploration also runs `sai-state reset <id> explore-slice@1` and
  `sai-state reset <id> direct-build-run@1` (no route is running then), which drop
  the slice inventory, the cursors, the publication answer, and the Direct Build
  run state, so no stored document can start a route afterwards.
- **`status`** (`--set intent=status`): reads the exploration and changes nothing,
  in any exploration. The turn check of `sai/commands/explore/body.md` uses it.
- **While `paused`**, every intent other than `resume` (and `status`) answers
  `rejected: "EXPLORATION_PAUSED"`, including the section and list events, and
  changes nothing. **While `closed`**, every intent other than `status` answers
  `rejected: "EXPLORATION_CLOSED"`. The `next` pointer of both names the common step
  and says no explore step is in force.

## Responses

A machine error exits 1 with `{error, next}` and one closed literal:

- `INVALID_EVENT`: a missing `@version` or a transition the machine rejects as
  non-conforming (a logic failure, no `reason`). When the event JSON read from
  the input cannot be parsed (empty, truncated, trailing text, broken quotes), the
  response also carries `reason: "EVENT_UNPARSEABLE"` (a delivery failure) and
  no transition occurs.
- `UNKNOWN_MACHINE`: an unknown base name.
- `VERSION_MISMATCH`: a known base name with the wrong version.

The `block` verb alone answers a missing block with `{error: "BLOCK_NOT_FOUND"}`
(exit 1), without `next`.

A store write that does not complete is reported, never swallowed, and exits 1
with no `stage` and no `next`:

- `STORE_WRITE_FAILED`: the session file could not be written; it keeps its
  previous state and the machine did not advance. The response carries the
  error text as `detail`.
- `STORE_CONFLICT`: another writer changed the session file between this verb's
  read and its write (the `revision` counter differs); nothing was written. The
  emitter does not retry it: re-sending an Explore intent after another
  writer's event could advance two stages.

Both follow § Degraded mode. `spawn` and `reset` report them the same way.

A `rejected` field (exit 0) means the machine did not advance, for example an
intent-less advance or `ALREADY_RUNNING`: fetch nothing and give the
acknowledgement the owning command defines. A step machine rejects a step
report that names an id it does not declare with
`rejected: "UNKNOWN_STEP_ID"`, the unknown ids in `unknown_ids`, and `next`
carrying the unchanged active pointer (§ Step machines).

A `warnings` array (first value `SESSION_FILE_CORRUPT`) reports store
degradation inside that same response: the unparseable session file was renamed
aside, the path of the preserved copy is in `corrupt_file`, and the verb
continued from the initial state. Treat the returned `stage` as authoritative
and surface the regression against the presentation hint.

## Event delivery

An identifier event, one whose values are all identifiers or paths with no free
text, travels as flags in one call, the canonical example's emit line with
`--set <field>=<id>`, repeatable `--add <field>=<id>`, and
`--set-path <field>="<path>"` (§ Verbs, Emit). Identifiers need no quoting, so
the line is identical in Bash and PowerShell 7 (the shells
`@sai/policies/command-execution.md` supports) on both Claude Code and opencode.
A `--set-path` value holds no `"`, `$`, backtick, or control character; the
paths run events carry come from `temp-root.js mkdtemp` and `transfer.js open`,
so a rejected path is rare.

An event that holds free text, or a path the flags reject, travels as an input
file, never as an argument, a stdin pipe, or a heredoc. Prepare it in this order
on both Claude Code and opencode:

1. Run `transfer.js` as `node <tool-path> open --harness <claude|opencode>` once
   per session. It creates one private directory under the SAI temp root and
   returns its absolute `dir`; reuse it for every later event.
2. Write the event JSON as UTF-8 to a unique file in `<dir>` (for example
   `event-<n>.json`) with the harness-native file-write tool (`Write` on Claude
   Code, `write` on opencode). Each call uses its own file, so parallel calls
   never share one. The write goes outside the repository.
3. Run the emit line with `--input-file <dir>/<file>` in place of the flags.
   Nothing is quoted or escaped and the tool receives the bytes exactly.

`--input-file` wins over stdin. The `-` stdin form stays accepted only so
instructions installed before the input file keep working. The same procedure
delivers the progress emit payload (`--progress --input-file <path>`).

The store strips a leading BOM and surrounding whitespace or line breaks
before parsing. A shell pipe may re-encode non-ASCII characters and the store
accepts them as received, so events carry identifiers,
never free text: a `recordedList` holds only list ids (`"E1"`, `"E2"`, …,
`"I1"`, …, or the Step ids), because the machine reads only whether the list
is recorded or empty. `explore-slice@1` is the one exception: its
`recordedList` carries `Change name:` values, which are kebab-case ASCII
identifiers, because that machine tracks slices by name. Route events carry no
slice name; the machine always chooses the first pending entry in that ordered
inventory.

**Document emits are the one exception.** The document emit carries free-text
documents, so it travels as files, never as single-quoted JSON and never
through a shell command: each document in its own file and its verdicts in a
verdicts file, all written with the harness-native file-write tool per
`@sai/policies/issue-format.md` § Change document (Transport), then
passed as absolute paths. The invocation is identical in Bash and PowerShell 7
on both Claude Code and opencode. Write each document exactly as it will be
displayed:

```text
node <tool-path> emit <id> explore-slice@1 --document-file <path> --verdicts-file <path> --document-file <path> --verdicts-file <path>
```

Each verdicts file holds one JSON array: the verdicts the hygiene judgment
supplies for the document before it, or `[]` when no line is flagged, with each
`line` counted in the document file. A file write keeps non-ASCII characters
byte for byte; the section headings and the keys of `## Change` are English and
the change names are kebab-case ASCII. A document emit that cannot be delivered
returns `DOCUMENT_READ_FAILED` or `EVENT_UNPARSEABLE` and falls under § Corrective
retry; a validation failure does not, and follows the retry rule of the command
that sends the document set. When the files cannot be prepared, the emit stops and
reports the error: there is no stdin fallback.

## Corrective retry

A delivery failure — `reason: "EVENT_UNPARSEABLE"`,
`reason: "DOCUMENT_READ_FAILED"`, or an `emit` usage error (exit 2) — gets
up to 2 retries of that same emit without asking the user, before any store
failure is declared. Each retry corrects the delivery form to
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
`INVALID_EVENT` or `UNKNOWN_MACHINE`; an unreachable store, `STORE_WRITE_FAILED`,
`STORE_CONFLICT`, `VERSION_MISMATCH`, and a closed session follow § Degraded
mode instead.

## Degraded mode

When the store is unreachable or degraded (`STORE_WRITE_FAILED` and
`STORE_CONFLICT` included), hold the current stage without
auto-advancing and ask the user for an explicit next step; the progression
continues in degraded mode without re-deriving the transition table in prose.
Version-mismatch and closed-session outcomes fall to this degraded path
rather than continuing against a mismatched machine. A command that declares
its own store-failure fallback follows it instead. The goal-driven
coordinators that drive a linear step machine never run degraded: their
fallback is their static step order (see § Step machines).

## Step machines

A linear step machine is advance-only, routing-only, one happy-path sequence
of step files. The machine definition (step ids, step files, stage table,
initial state) is a data module in `sai-state/machines/`. No card declares a
`step_machine` adapter field any more: the goal-driven coordinators (for
example `red-steps@1`, `green-steps@1`, `review-steps@1`, the audit
`{audit}-steps@1`, `spec-steps@1`, and `design-steps@1`) drive their machines
from their own card, which names the events it emits and its static step order.
The rules below hold for every one of them.

1. **Segment start**: `spawn`, then immediately `reset <id> <machineId>`.
   `reset` returns `{stage, next: {follow, hint}}` for its first filed step.
   Retain the returned `stage` and `next`. The first step of every step
   machine is fileless (`follow: none`), so its report would only relay that
   pointer. Instead, send the pointer line `Active step: <stage> — follow
   <next.follow>` as the first line of the task message, before the task. The
   worker runs the fileless first step inline, follows that pointer, and
   reports both ids in its first step report. The first emit after reset
   therefore normally carries two ids; when it carries only the first, the
   machine returns the same pointer again, with no error. This rule is
   phase-neutral: it applies to every card that drives a step machine, with no
   per-phase exception.
2. **Each step report**: emit `{"step_ids":[...]}` with the ids the worker
   reported, in order, as its card says. The machine advances on declared new
   ids. A report that names an id the machine does not declare changes nothing:
   the response is `rejected: "UNKNOWN_STEP_ID"` (exit 0) with the unknown ids
   in `unknown_ids` and `next` carrying the unchanged active pointer, and the
   declared ids of that report are not applied, so the worker reports the whole
   step again. Send the returned `next.follow` as
   `Active step: <id> — follow <path>`; `next.follow: none` is terminal.
3. **Questions and replacements** do not invoke emit and do not consult the
   machine: the active step file persists across them, and the machine stays
   parked until the next step report. A replacement worker re-resolves its
   active step from the surviving session's machine state without re-emitting.
   Before the first progress event, that active step is the first filed step
   from the `reset` response, so the replacement's first message carries its
   pointer line, never the fileless first step's `none`.
4. **Run close**: `reset <id> <machineId>` again, so a later run starts at
   step zero.

The store never gates these runs. When the store is unreachable, answers
`STORE_WRITE_FAILED` or `STORE_CONFLICT`, or an emit still fails after
§ Corrective retry, the card sends the next pointer from the static step order
it lists and carries on. An `UNKNOWN_STEP_ID` rejection is not a store failure:
re-steer the worker with the returned pointer instead of falling back to the
static order.

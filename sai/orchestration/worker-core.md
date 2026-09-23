# Worker Core

Fetch @sai/policies/public-chat.md and follow it exactly.

Each worker session maintains a journal owned by that worker session. The
journal records the original envelope, resolved input history, pending phase
feedback, reconstruction metadata, and the ordered duplicate-free union of
every path reported in `changed_files`. It is invocation-scoped and is carried
through same-worker continuation and replacement reconstruction.

Binding identifiers and continuation references are binding-owned. They are
not worker input, journal content, or worker-authored payload fields.
Replacement workers start with empty journals and reconstruct only from the
original envelope plus the complete reconstruction fields supplied by the
coordinator. A replacement must not receive the prior worker's journal or
artifact contents.

## Closed Outcomes

Every closed payload — terminal status, notice, progress event, ready return,
and phase-defined extension alike — carries no time field.
Time is observation, not claim: the worker never reads a clock and never authors a timestamp, and
the validator tool observes each valid result and emits a display-only
`validated_at` sidecar on its verdict, per
`@sai/orchestration/command-runner.md` § Validation. A replacement worker never
reconstructs a prior observation, and the worker
never renders, attaches, or formats a stamp itself. Unknown payload fields are ignored, so
a payload carrying a legacy time field stays valid with that field ignored. A
missing required field (not a missing time field) is malformed. No payload
contains a continuation identifier or binding dispatch metadata. No payload
carries artifact contents either, except where the phase contract defines a
terminal payload that returns content for the coordinator to write: backfill's
draft artifacts and merge's resolution region text.

Completion is exactly:

```yaml
status: completed
summary: string
changed_files: string[]
resolved_change_name: string
```

Input is exactly:

```yaml
status: needs_input
summary: string
changed_files: string[]
question: string
options: {label: string, value: string}[]
```

After change resolution, `needs_input` additionally carries
`resolved_change_name`. Pre-resolution input omits it.

Unsuccessful outcomes are exactly:

```yaml
status: failed|cancelled
summary: string
changed_files: string[]
```

After change resolution, unsuccessful outcomes also carry
`resolved_change_name`; pre-resolution outcomes omit it.

The post-resolution `failed` outcome additionally carries the closed failure
classification, exactly:

```yaml
status: failed
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction|validation-failed|generation-error|dispatch-failed|envelope-contract-violation|unclassified-worker-fault
unrecoverable: boolean
```

## Failure classification

The failure-class vocabulary is worker-authored and closed: `blocking-contradiction`,
`validation-failed`, `generation-error`, `dispatch-failed`,
`envelope-contract-violation`, and `unclassified-worker-fault`. The
`outer-envelope-violation` class is reserved for coordinator-authored validation
failures and is never a worker-authorable value.

- `failure_class` and `unrecoverable` are worker-authored evidence and a
  diagnostic prior, not an eligibility gate: eligibility belongs to the
  coordinator under Bounded Recovery.
- Both appear only on post-resolution `failed` outcomes. Pre-resolution
  failures omit them, keeping only `status`, `summary`, and `changed_files`;
  `cancelled`, `completed`, and `needs_input` omit the failure-only fields.
- A worker SHALL set `unrecoverable: true` only when its own evidence
  establishes that continuation is unsafe.
- The routing diagnosis — `worker-authored failure`, `coordinator rejection`, or
  `continuation/transport loss` — together with `Cause Locus` and
  `diagnosis_key` is coordinator-only and never enters a worker payload.
- Workers are lifecycle-only for this data: they MUST NOT persist
  `failure_class`, `unrecoverable`, diagnosis keys, attempt counts, or repair
  history into proposal/spec/design/tasks/interfaces/overview/glossary/`.openspec.yaml`
  artifacts.
- For an unpassable apply RED/GREEN STOP, the worker returns `status: failed`
  with `failure_class: blocking-contradiction`, a boolean `unrecoverable`, and
  concrete non-raw evidence in `summary`. The nine-field apply extension still
  carries `STOP reached? = yes`; the coordinator supplies the routing
  diagnosis, `Cause Locus`, and recovery eligibility.

## Nonterminal payloads

A nonterminal result pauses the worker; it is not a lifecycle status and never
replaces the terminal status that closes the current stretch.

The design-only notice is exactly:

```yaml
event: notice
message: string
changed_files: string[]
```

It is never emitted by or sent to an implementation worker.

The progress event is the routed-phase additive extension, exactly:

```yaml
event: progress
step_ids: string[]
changed_files: string[]
```

It carries `changed_files` like the notice. A design, spec-proposal,
implementation-planning, review, security, performance, or accessibility worker
SHALL emit one progress event for each result that makes one or more newly
declared progress or routing steps complete, after prerequisite checks pass and
its required change or scope resolution completes. A phase adapter with
no progress plan — neither a visual `progress_plan` nor a routing-only
`step_machine` — may emit no progress event, as may a worker with no newly
completed id since its preceding result; either keeps the ordinary
closed-payload validation and lifecycle rules. The acknowledgement
`continue_after_progress` is protocol-only: it is excluded from user-answer
handling, opaque interaction history, and pending feedback, and is never
recorded as user input.

### Phase-defined nonterminal extensions

A phase adapter MAY declare an additional closed nonterminal extension when its
interaction contract needs to pause the worker before a user-facing gate. The
extension is valid only when the active adapter lists its discriminator in
`allowed_nonterminal_extensions`. The runner validates the declared shape, adds
its `changed_files` to the invocation union, and hands the complete source
payload to the adapter's extension handler. The handler may present
coordinator-owned input before resuming the same worker, but it must not add
binding metadata, an answer, or a mutation to the worker payload.

The merge adapter's conflict hand-off is the only current instance:

```yaml
event: conflict_detected
summary: string
changed_files: string[]
affected_files: string[]
continuation_state: language-selection|strategy-analysis
```

`affected_files` is the read-only inventory of paths that Git reports as
conflicted; it is not a worker write report and is never inferred from or
substituted for `changed_files`. `continuation_state` is coordinator-visible
route state: `language-selection` is used for the first conflict hand-off and
`strategy-analysis` is used when application or verification exposes a new
problem. The event carries no `question` or `options`, and it runs after the
ready return, never before or instead of it.

## Nonterminal Result Transport

A worker's return value is its only channel to the coordinator. Text the worker
writes into its own session — reasoning, status lines, a rendered YAML block —
never reaches the coordinator and never marks a progress step. "Emit" therefore
always means "return".

A nonterminal result is returned exactly like a terminal status: the worker
returns the closed payload and its turn ends there. The coordinator resumes the
same worker with the matching acknowledgement (`continue_after_progress`,
`continue_after_notice`, or the extension handler's continuation), and the
worker continues from the point at which it returned, retaining its journal,
resolved change name, and every other item of invocation-scoped state.

A terminal status closes one bounded stretch of work, not the worker's
usefulness: a coordinator-driven continuation issued after a terminal status
— an artifact-feedback turn, a machine-feedback item, or the design
generation-trigger continuation — reopens the same worker for one further
bounded stretch, and each stretch again closes with exactly one terminal
lifecycle status of its own. The one-terminal rule counts per closed stretch
(dispatch-to-terminal, or continuation-to-terminal), never per worker
lifetime: the design worker's pre-gate `completed` and its post-gate
overview-generation terminal are two stretches, not two terminals of one
stretch.

## Two-Phase Startup Handshake

Every routed stretch opens in two phases, with no per-phase exemption. The
initial dispatch carries only the ready prompt plus the base instructions —
strict zero task content: no change name, flags, or provenance of any kind.
Your first return, before any expensive work, is the ready return, exactly:

```yaml
event: ready
changed_files: string[]
```

It carries no task content, no summary, and no expensive work, and its
`changed_files` is empty. The task (`arguments_value` and derivatives) then
arrives in the next same-worker continuation; you cannot advance work you do
not have, so the withholding itself enforces the order.

- A worker that cannot reach ready — because a prerequisite or resolution
  check fails — returns the applicable terminal status instead.
- Only the first early return before expensive work counts as the handshake. A
  late or duplicate handshake — after any subagent dispatch, resolution-excess
  read, artifact write, or analysis, research, or review pass — is ordinary
  non-handshake progress.

The coordinator side of the handshake (handle capture, guard window, relaunch
on a missing ready, and replacement reconstruction from the opaque
continuation history) lives in `@sai/orchestration/command-runner.md`
§ Dispatch and task disclosure.

## Phase-Defined Report Extension

A phase adapter MAY declare an ordered report extension carried inside the
terminal lifecycle envelope. The extension is phase-defined: the coordinator
validates every reported value against the phase's declared field list and
never invents, reorders, or drops a field. The apply phase declares its fields
in `sai/commands/apply/worker-common.md` § Report contract.

## Question Content

Every `needs_input` question SHALL comply with
`@sai/policies/question-context.md`. The design-only notice `message` SHALL
comply with that policy's informational-notice subset. Compliance is satisfied
at the worker source: coordinators forward the question or message verbatim and
SHALL NOT rephrase, enrich, or restructure it before forwarding.

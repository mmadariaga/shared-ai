# Worker Core

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

Every closed payload — terminal status, design notice, and progress event alike —
carries `emitted_on` immediately after its `status` or `event` discriminator. It
is the worker-authored ISO-8601 instant at which the worker composed that
result, in the exact form `YYYY-MM-DDTHH:MM:SS±HH:MM` (for example
`2026-08-17T14:32:05+02:00`): local wall-clock time followed by the session's
numeric UTC offset, colon-separated, never the `Z` designator, and never
omitted. A machine running on UTC writes `+00:00`. It is mandatory in every
payload below; a result missing it, or carrying a non-ISO-8601 or
offset-less value, is malformed.
See [Result Emission Time](#result-emission-time).

Completion is exactly:

```yaml
status: completed
emitted_on: string
summary: string
changed_files: string[]
resolved_change_name: string
```

Input is exactly:

```yaml
status: needs_input
emitted_on: string
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
emitted_on: string
summary: string
changed_files: string[]
```

After change resolution, unsuccessful outcomes also carry
`resolved_change_name`; pre-resolution outcomes omit it.

The post-resolution `failed` outcome additionally carries the closed failure
classification, exactly:

```yaml
status: failed
emitted_on: string
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction|validation-failed|generation-error|dispatch-failed|envelope-contract-violation|unclassified-worker-fault
unrecoverable: boolean
```

The failure-class vocabulary is worker-authored and closed: `blocking-contradiction`,
`validation-failed`, `generation-error`, `dispatch-failed`,
`envelope-contract-violation`, and `unclassified-worker-fault`. The
`outer-envelope-violation` class is reserved for coordinator-authored validation
failures and is never a worker-authorable value. Pre-resolution failures omit
`failure_class` and `unrecoverable`, keeping only `status`, `summary`, and
`changed_files`. `cancelled`, `completed`, and `needs_input` omit the
failure-only fields. A worker SHALL set `unrecoverable: true` only when its own
evidence establishes that continuation is unsafe.

### Step 3 GREEN contract

Worker-authored `failure_class` and `unrecoverable` remain on failed outcomes
only. The routing diagnosis is coordinator-only and coordinator-owned. Its
diagnoses — `worker-authored failure`, `coordinator rejection`, and
`continuation/transport loss` — together with `Cause Locus` and `diagnosis_key`,
are never worker payload fields and MUST NOT enter the closed lifecycle shape.

For an unpassable apply RED/GREEN STOP, the worker returns `status: failed` with
`failure_class: blocking-contradiction`, a boolean `unrecoverable`, and concrete
non-raw evidence in `summary`. The worker sets `unrecoverable: true` only when
its evidence establishes that continuation is unsafe. The nine-field apply
extension remains unchanged and carries `STOP reached? = yes`; the coordinator
supplies the routing diagnosis, `Cause Locus`, and recovery eligibility.

Planning-only boundary: the closed `failure_class` and boolean `unrecoverable`
remain worker-authored only on post-resolution `failed` outcomes; they are
worker-authored evidence and a diagnostic prior, not an eligibility gate—eligibility
remains in Bounded Recovery and is coordinator-owned. Routing diagnosis, `Cause
Locus`, and `diagnosis_key` remain coordinator-owned and never worker payload fields;
`outer-envelope-violation` remains coordinator-only and never worker-authorable.
Planning workers MUST NOT persist `failure_class`, `unrecoverable`, diagnosis keys,
attempt counts, or repair history into proposal/spec/design/tasks/interfaces/overview/
glossary/`.openspec.yaml` artifacts; these are lifecycle-only.

The design-only notice is exactly:

```yaml
event: notice
emitted_on: string
message: string
changed_files: string[]
```

It is not a lifecycle status and is never emitted by or sent to an
implementation worker. No outcome contains a continuation identifier,
binding dispatch metadata, or artifact contents.

The progress event is the routed-phase additive extension, exactly:

```yaml
event: progress
emitted_on: string
step_ids: string[]
changed_files: string[]
```

It carries `changed_files` like the notice. It is nonterminal and not a
lifecycle status: a design, spec-proposal, implementation-planning, review, security,
performance, or accessibility worker SHALL emit one progress event for each
result that makes one or more newly declared progress or routing steps complete
after prerequisite checks pass and its required change or scope resolution
completes, and the run still closes with exactly one terminal lifecycle status
preceded by zero or more nonterminal results. A worker whose phase adapter
declares neither a visual `progress_plan` nor a routing-only `step_pointer_map`
— or a declared worker with no newly completed id since its preceding result —
may emit no progress event and retains its existing payload validation and
lifecycle behavior. Its acknowledgement
`continue_after_progress` is protocol-only and is excluded from user-answer
handling, opaque interaction history, and pending feedback; it is never
recorded as user input. No progress event contains a continuation identifier,
binding dispatch metadata, or artifact contents.

A phase adapter with no progress plan may emit no progress event and still
retains the ordinary closed-payload validation and lifecycle rules.

## Result Emission Time

`emitted_on` is worker-authored and describes one result, not the run. The
field order shown in [Closed Outcomes](#closed-outcomes) is serialization order,
not composition order. The worker SHALL decide every other field and complete
the payload before reading the clock. For each payload it returns, the worker
SHALL read the clock exactly once, as its last action before returning. After
that read it SHALL return the payload without another clock read; a second read
for the same payload is prohibited. If anything about the payload changes after
the read, the value stands and is never re-read. A composition abandoned without
returning a payload discards its read and cannot carry it into a later payload.

The value SHALL come from that one clock read; a worker SHALL NOT estimate,
infer, reuse, back-date, forward-date, or copy a value from an earlier result,
or carry forward a time it did not read. If the clock read is unavailable or
fails, the worker SHALL return the payload with the literal sentinel
`1970-01-01T00:00:00+00:00` in `emitted_on`; the unavailable read still counts as
that payload's one read, and it is not a failure path. The sentinel is an
explicit exception to the run's non-decreasing-values property: it may occur
in any result position and neither invalidates the run nor requires a later
payload to be re-read or changed. Excluding sentinel values, actual clock
values remain non-decreasing in return order, and a terminal result with an
available clock carries the latest actual value. A payload following
`continue_after_progress` or `continue_after_notice` is a new payload with its
own one-read bound.

The instant is written in the session's local zone with its numeric offset
attached, so the wall-clock reading and the absolute instant travel together:
characters 12–16 are the local `HH:MM` a reader recognises, and the trailing
offset keeps the value an unambiguous instant, exactly as comparable as a UTC
one. The offset is the worker's own at composition time. A run that crosses a
daylight-saving transition therefore carries two different offsets, and its
values remain correct instants while ceasing to sort lexicographically — an
accepted trade for local readability the rest of the year.

The field is present in every closed payload and in every phase, including a
phase whose adapter declares no progress plan and a pre-resolution result that
omits `resolved_change_name`. Unlike `resolved_change_name`, `failure_class`,
and `unrecoverable`, it is never conditional.

It is worker state, not binding state: it is not a continuation identifier, not
binding dispatch metadata, and not artifact contents, so it stays worker-authored
under the same rules as `summary` and `changed_files`. A coordinator forwards or
records it verbatim and SHALL NOT invent, correct, re-derive, or reformat it.
A replacement worker authors its own `emitted_on` for its own results and never
reconstructs the prior worker's values.

`emitted_on` is the sole source of the Milestone Stamp. The stamp is the
coordinator-rendered `HH:mm` annotation a progress task list attaches to a step
when it renders `completed` per `@sai/policies/todo-structure.md`, and its value
is the `emitted_on` of the result that marked that step — a progress event for a
step it marks, the terminal `completed` payload for a step closed by run-closing
reconciliation. The coordinator never reads a clock to produce a stamp. A worker
that authors an inaccurate `emitted_on` therefore renders an inaccurate stamp.
The single clock read as the final action before return is what supplies its
accuracy; the worker never reconstructs that value afterwards. The worker still
never renders, attaches, or formats a stamp itself.

## Nonterminal Result Transport

A worker's return value is its only channel to the coordinator. Text the worker
writes into its own session — reasoning, status lines, a rendered YAML block —
never reaches the coordinator and never marks a progress step. "Emit" therefore
always means "return".

A progress event and a design notice are returned exactly like a terminal
status: the worker returns the closed payload as its result and its turn ends
there. It does not continue working after composing one. The coordinator marks
the reported step ids, updates the rendered task list, and resumes the same
worker with exactly `continue_after_progress` or `continue_after_notice`; the
worker then continues from the point at which it returned, retaining its
journal, resolved change name, and every other item of invocation-scoped state.
Returning a nonterminal result is a pause, never an abandonment of remaining
work and never a substitute for the one terminal lifecycle status that closes
the run.

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

## Startup Handshake

The first nonterminal return is a handshake and SHALL come early. A worker with
a declared progress plan returns its startup progress event as soon as
prerequisite checks pass and its required change or scope resolution completes,
and **before** dispatching any subagent, reading beyond what resolution
requires, writing any artifact, or beginning any analysis, research, or review
pass. Long work never precedes the handshake.

The handshake exists so that the coordinator holds a resumable handle to the
live worker before the phase's expensive work begins. Without it, a stalled or
user-interrupted run has no handle to resume and must be restarted from
scratch. A worker that cannot reach the handshake — because a prerequisite or
resolution check fails — returns the applicable terminal status instead, which
serves the same purpose.

## Phase-Defined Report Extension

A phase adapter MAY declare an ordered report extension carried inside the
terminal lifecycle envelope. The extension is phase-defined: the coordinator
validates every reported value against the phase's declared field list and
never invents, reorders, or drops a field. The apply phase declares exactly
nine ordered report fields:

1. `Step executed`
2. `Per-item status`
3. `RED result`
4. `GREEN result`
5. `Deviations`
6. `Technical learnings/friction`
7. `STOP reached?`
8. `Files modified`
9. `Attempts per phase`

Field 8 is required in every apply report: an explicitly present empty list is
valid, while an omitted field 8 makes the report malformed. Field 9 is the sole
soft-degradation exception — an absent or empty field 9 never makes a report
malformed and never blocks checkbox marking, the pre-commit report, or the
commit gate. No report field carries a continuation identifier, binding
dispatch metadata, or artifact contents.

## Question Content

Every `needs_input` question SHALL comply with
`@sai/policies/question-context.md`. The design-only notice `message` SHALL
comply with that policy's informational-notice subset. Compliance is satisfied
at the worker source: coordinators forward the question or message verbatim and
SHALL NOT rephrase, enrich, or restructure it before forwarding.

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

Every closed payload — terminal status, design notice, and progress event alike —
carries no time field. Worker payloads are timeless: the worker never reads a
clock, never authors a timestamp, and never carries `status`/`event` plus time.
Unknown payload fields are ignored with no explicit legacy handling; a payload
carrying a legacy time field stays valid with that field ignored. Time is
observation, not claim: the validator tool observes validation time and emits an
additive display-only `validated_at` sidecar on its verdict (see
[Validator-Observed Time](#validator-observed-time)). A missing required field
(not a missing time field) is malformed.

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
message: string
changed_files: string[]
```

It is not a lifecycle status and is never emitted by or sent to an
implementation worker. No outcome contains a continuation identifier,
binding dispatch metadata, or artifact contents.

The progress event is the routed-phase additive extension, exactly:

```yaml
event: progress
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

### Phase-defined nonterminal extensions

A phase adapter MAY declare an additional closed nonterminal extension when its
interaction contract needs to pause the worker before a user-facing gate. The
extension is valid only when the active adapter lists its discriminator in
`allowed_nonterminal_extensions`; it is not a lifecycle status and it does not
replace the terminal result that closes the current worker stretch. The runner
validates the declared shape, adds its `changed_files` to the invocation union,
and hands the complete source payload to the adapter's extension handler. The
handler may present coordinator-owned input before resuming the same worker,
but it must not add binding metadata, an answer, or a mutation to the worker
payload.

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
problem. The event carries no `question`, `options`, artifact contents,
continuation identifier, or binding dispatch metadata. It carries no time field;
the validator's `validated_at` sidecar supplies observation time.

## Validator-Observed Time

`validated_at` is validator-observed and describes when the pipeline saw the
result, not when the worker claims it finished. Worker payloads carry no time
field and the worker never reads a clock. The validator tool owns the only
clock: on each valid result it reads the clock once and emits an additive
display-only `validated_at` sidecar in the exact form
`YYYY-MM-DDTHH:MM:SS±HH:MM` — local wall-clock time with the session's numeric
UTC offset attached, colon-separated, never the `Z` designator. A machine on UTC
writes `+00:00`. Reception time substitutes emission time; the small transport
delta is accepted as a duration proxy.

The sidecar never alters the validation decision or payload identity: exit codes
and `ok`/`errors` semantics are unchanged, the payload is never rewritten, and
unknown payload fields stay ignored with no explicit legacy handling. A payload
carrying a legacy time field stays valid with that field ignored. Invalid
results carry no timestamp. The sidecar applies to all four validated kinds
(terminal, notice, progress, `conflict_detected`).

The instant is written in the validator's local zone with its numeric offset
attached, so the wall-clock reading and the absolute instant travel together:
characters 12–16 are the local `HH:MM` a reader recognises, and the trailing
offset keeps the value an unambiguous instant, exactly as comparable as a UTC
one. Zone handling lives in the tool; the coordinator never reads wall-clock
time and never resolves a timezone.

It is validator state, not worker or binding state: it is not a continuation
identifier, not binding dispatch metadata, and not artifact contents. A
coordinator forwards the verdict verbatim, surfaces `validated_at` in its prompt
for terminal and progress results at minimum, and SHALL NOT invent, correct,
re-derive, or reformat it. A replacement worker authors no time and never
reconstructs a prior observation.

`validated_at` is the sole source of the Milestone Stamp. The stamp is the
coordinator-rendered `HH:mm` annotation a progress task list attaches to a step
when it renders `completed` per `@sai/policies/todo-structure.md`, and its value
is the `validated_at` of the verdict that marked that step — a progress verdict
for a step it marks, the terminal `completed` verdict for a step closed by
run-closing reconciliation. The coordinator never reads a clock to produce a
stamp. The validator's observation supplies its accuracy. The worker still
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

## Two-Phase Startup Handshake

A handshake is the worker's first early nonterminal return before
expensive work. A ready is the trivial handshake return reporting
availability to receive the task, carrying no expensive work. A handle
is the harness-native resumable identifier (Claude agent ID, opencode
task_id) the coordinator captures at dispatch return and retains before
any guard snapshot or continuation. A guard window is one
snapshot-to-verify span holding guard_base for a single
dispatch-to-result stretch.

Every routed stretch opens in two phases. The initial dispatch carries
only the ready prompt plus the base instructions; zero task content
travels before ready. Ordering is enforced by information withholding —
the worker cannot advance work it does not have — not by a prose rule.
The task travels exclusively in the sequential same-worker continuation
after the ready return (valid in both harnesses).

Ready absence is a dispatch failure: when ready never arrives, the
coordinator relaunches fresh with the original envelope, with no
timeouts, retries, or new escalation. Pre-ready stall is lossless by
construction — only base loading is at risk — so resume-before-ready is
unnecessary and relaunch suffices. Post-task stall keeps the current
behavior unchanged.

The original envelope is minimal; the task lives in the continuation
and the opaque history. Replacement reconstruction recovers the task
from the opaque continuation history, since the minimal envelope alone
carries no task content.

Two round trips apply to every routed stretch with no per-phase
exemption, including every RED and GREEN dispatch per apply Step. The
change bounds loss; it does not guarantee readiness: a dead worker
still returns nothing.

A worker that cannot reach ready — because a prerequisite or resolution
check fails — returns the applicable terminal status instead, which
serves the same purpose.

Only the first early return before expensive work counts as the
handshake. A late or duplicate handshake — any subagent dispatch,
resolution-excess read, artifact write, or analysis, research, or
review pass before the first nonterminal return — is treated as
ordinary non-handshake progress and is not marked resumable.

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

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
performance, or accessibility worker SHALL return one progress event for each
result that makes one or more new plan steps complete after prerequisite
checks pass and its required change or scope resolution completes, and the
run still closes with exactly one terminal lifecycle status preceded by zero
or more nonterminal results. A worker whose
phase adapter declares no progress plan — or a planned worker with no newly
completed step since its preceding result — may emit no progress event and
retains its existing payload validation and lifecycle behavior. Its acknowledgement
`continue_after_progress` is protocol-only and is excluded from user-answer
handling, opaque interaction history, and pending feedback; it is never
recorded as user input. No progress event contains a continuation identifier,
binding dispatch metadata, or artifact contents.

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

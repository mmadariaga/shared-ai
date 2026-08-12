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
result that makes one or more new plan steps complete after prerequisite
checks pass and its required change or scope resolution completes, and the
run still closes with exactly one terminal lifecycle status. A worker whose
phase adapter declares no progress plan — or a planned worker with no newly
completed step since its preceding result — may emit no progress event and
retains its existing payload validation and lifecycle behavior. Its acknowledgement
`continue_after_progress` is protocol-only and is excluded from user-answer
handling, opaque interaction history, and pending feedback; it is never
recorded as user input. No progress event contains a continuation identifier,
binding dispatch metadata, or artifact contents.

## Question Content

Every `needs_input` question SHALL comply with
`@sai/policies/question-context.md`. The design-only notice `message` SHALL
comply with that policy's informational-notice subset. Compliance is satisfied
at the worker source: coordinators forward the question or message verbatim and
SHALL NOT rephrase, enrich, or restructure it before forwarding.

# Worker Lifecycle

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

# Design Phase Contract

This is the canonical phase contract for routed `sai-2-design` execution. The
coordinator, the design worker, and Explore's supervised design adapter consume
this file together with the generic contracts it names. No consumer may
redefine the progress plan, step pointers, write surface, or result union
inline.

## Ownership

- **Coordinator** — owns lifecycle routing, closed-result validation, the
  coordinator-scoped `changed_files` union, visual progress rendering, step
  pointer delivery, feedback-gate presentation, and terminal navigation. It
  performs no technical design work and never writes phase artifacts.
- **Worker** — owns prerequisite checks, change resolution, research, design
  artifact generation, validation, permitted glossary changes, feedback
  corrections on the authorized surface, and overview lifecycle. It returns
  metadata-only lifecycle results; it never renders panels or presents the
  artifact gate.
- **Binding** — owns harness dispatch identifiers and continuation transport.
  It forwards the opaque `arguments_value` and worker-authored payloads
  without adding phase state to the worker request.
- **Explore** — owns selector state, supervised autonomy, review rounds,
  diagnosis routing, and the design-to-implementation transition. It remains
  read-only and does not become a second design worker or reviewer.

Generic lifecycle, question, feedback, and recovery semantics remain owned by
`@sai/orchestration/worker-core.md`,
`@sai/orchestration/command-runner.md`,
`@sai/policies/question-context.md`,
`@sai/policies/artifact-feedback-gate.md`, and
`@sai/policies/bounded-recovery.md`. This phase contract supplies only the
design-specific declarations.

## Progress and pointer declarations

### `DesignProgressPlan`

The design adapter's canonical `progress_plan` has two static variants, selected
by raw `--overview-lang` token presence. Both are exactly:

**Opted-in plan (`--overview-lang` present):**

- `prereqs-resolution` — "Check prerequisites"
- `research` — "Research and resolve open questions"
- `design` — "Write design.md"
- `tasks` — "Write tasks.md"
- `interfaces` — "Write interfaces.md"
- `review` — "Review artifacts"
- `overview` — "Generate change-overview.md"

**Unopted plan (`--overview-lang` absent):**

- `prereqs-resolution` — "Check prerequisites"
- `research` — "Research and resolve open questions"
- `design` — "Write design.md"
- `tasks` — "Write tasks.md"
- `interfaces` — "Write interfaces.md"
- `review` — "Review artifacts"

### `DesignStepPointerMap`

The canonical `step_pointer_map` is:

| step id | just-in-time instruction pointer |
| --- | --- |
| `prereqs-resolution` | none |
| `research` | `@sai/commands/design/steps/research.md` |
| `design` | `@sai/commands/design/steps/design.md` |
| `tasks` | `@sai/commands/design/steps/tasks.md` |
| `interfaces` | `@sai/commands/design/steps/interfaces.md` |
| `review` | `@sai/commands/design/steps/review.md` |
| `overview` | `@sai/commands/design/steps/overview.md` |

Progress-plan rendering and step-pointer routing are separate operations. When
the map is active, a progress continuation carries the protocol continuation
line followed by the pointer for the first unmarked step in the active plan;
after all declared steps in the active plan are marked, it carries the exact
`Active step: none — complete remaining work and return your terminal result.`
Artifact-feedback and recovery continuations carry no pointer line.

When no coordinator is sending pointer lines (supervised route or standalone worker),
the worker derives its active step from this map itself, taking the first unmarked
step in the active plan and the corresponding pointer from the table above. This
self-derivation path allows the worker to reach its step instructions without
relying on coordinator continuation lines.

## `DesignWriteSurface`

The closed `DesignWriteSurface` is:

- `openspec/changes/{change-name}/design.md`;
- `openspec/changes/{change-name}/tasks.md`;
- `openspec/changes/{change-name}/interfaces.md`;
- `openspec/changes/{change-name}/change-overview.md`;
- `openspec/changes/{change-name}/.openspec.yaml` — overview state carrier only;
- `openspec/changes/{change-name}/proposal.md` — only under spec-problem
  handling; and
- `openspec/changes/{change-name}/specs/**` — only under spec-problem handling.

The worker never writes `implementation.md`, tests, recovery metadata, recovery
counters, planning artifacts, or any project source/configuration file. The
coordinator never writes any member of this surface. A recovery diagnosis does
not widen it.

## `DesignResultUnion`

The design phase accepts the generic worker-core terminal statuses:

- `completed` — worker-authored `emitted_on`, `summary`, ordered
  duplicate-free `changed_files`, and post-resolution `resolved_change_name`
  and `overview_language`;
- `needs_input` — the same fields plus the worker's exact `question` and
  ordered `options` (with `resolved_change_name` and `overview_language` after
  resolution);
- `failed` — the same fields plus post-resolution `failure_class`,
  `unrecoverable`, and `overview_language` when resolution completed; and
- `cancelled` — the generic cancellation shape plus `overview_language` when
  resolved.

The sole allowed nonterminal extension is:

```yaml
event: progress
emitted_on: string
step_ids: string[]
changed_files: string[]
```

The design-only notice extension is:

```yaml
event: notice
emitted_on: string
message: string
changed_files: string[]
```

Every payload follows `@sai/orchestration/worker-core.md`; `emitted_on` remains
worker-authored and `changed_files` is unioned by the active coordinator in
first-seen order. Progress is nonterminal, notices are nonterminal, `needs_input`
pauses the same worker, and only `completed`, `failed`, or `cancelled` closes
the current lifecycle stretch.

## Placeholder declarations

The following placeholders are emitted in instruction files and resolved by
name:

| Placeholder | Resolved value | Context |
| --- | --- | --- |
| `{resolved_change_name}` | the resolved change identifier | step files (research.md, design.md, tasks.md, interfaces.md) |

# sai-1 Spec Phase Contract

This is the canonical phase contract for routed `sai-1-spec` execution. The
standalone coordinator, the spec-proposal worker, and Explore's supervised
spec adapter consume this file together with the generic contracts it names.
No consumer may redefine the progress plan, step pointers, write surface, or
spec result union inline.

## Ownership

- **Coordinator** — owns lifecycle routing, closed-result validation, the
  coordinator-scoped `changed_files` union, visual progress rendering, step
  pointer delivery, feedback-gate presentation, validation-report rendering,
  and terminal navigation. It performs no technical spec work and never
  writes phase artifacts.
- **Worker** — owns prerequisite checks, change resolution, research,
  proposal/spec generation, validation, permitted glossary changes, and
  feedback corrections on the authorized surface. It returns metadata-only
  lifecycle results and the phase-defined validation report; it never renders
  panels or presents the artifact gate.
- **Binding** — owns harness dispatch identifiers and continuation transport.
  It forwards the opaque `arguments_value` and worker-authored payloads
  without adding phase state to the worker request.
- **Explore** — owns selector state, supervised autonomy, review rounds,
  diagnosis routing, and the spec-to-design transition. It remains read-only
  and does not become a second spec worker or reviewer.

Generic lifecycle, question, feedback, and recovery semantics remain owned by
`@sai/orchestration/worker-core.md`,
`@sai/orchestration/command-runner.md`,
`@sai/policies/question-context.md`,
`@sai/policies/artifact-feedback-gate.md`, and
`@sai/policies/bounded-recovery.md`. This phase contract supplies only the
spec-specific declarations.

## Progress and pointer declarations

### `SpecProgressPlan`

The spec adapter's canonical `progress_plan` is exactly this ordered list:

- `prereqs-and-change` — "Check prerequisites"
- `research` — "Research the change request"
- `proposal` — "Write proposal.md"
- `specs` — "Write specs/**"
- `validation` — "Validate artifacts and derive the decision summary"
- `review` — "Review artifacts"

The retired five-step plan is not valid. The plan is a rendering declaration;
it is not worker instruction content.

### `SpecStepPointerMap`

The canonical `step_pointer_map` is:

| step id | just-in-time instruction pointer |
| --- | --- |
| `prereqs-and-change` | none |
| `research` | `@sai/commands/spec/steps/research.md` |
| `proposal` | `@sai/commands/spec/steps/proposal.md` |
| `specs` | `@sai/commands/spec/steps/specs.md` |
| `validation` | `@sai/commands/spec/steps/validation.md` |
| `review` | `@sai/commands/spec/steps/review.md` |

Progress-plan rendering and step-pointer routing are separate operations. A
coordinator may suppress or degrade the visual task list, including in
Explore-supervised execution, without suppressing pointer delivery to the
worker. When the map is active, a progress continuation carries the protocol
continuation line followed by the pointer for the first unmarked step; after
all steps are marked it carries the exact `Active step: none` completion
pointer. Feedback and recovery continuations carry no pointer line.

Explore's supervised adapter uses this pointer map as a routing-only
declaration and intentionally declares no visual `progress_plan`. It still
tracks worker progress ids for pointer derivation and never renders a second
spec task list over the Explore idea list.

## `SpecWriteSurface`

The closed `SpecWriteSurface` is:

- `openspec/changes/{change-name}/proposal.md`;
- `openspec/changes/{change-name}/specs/**`; and
- the repository-root `GLOSSARY.md`, only for terms resolved by the spec
  phase.

The worker never writes `design.md`, `tasks.md`, `interfaces.md`,
`implementation.md`, tests, recovery metadata, recovery counters, planning
artifacts, or any project source/configuration file. The coordinator and
Explore never write any member of this surface. A recovery diagnosis does not
widen it.

## `SpecResultUnion`

The spec phase accepts the generic worker-core terminal statuses:

- `completed` — worker-authored `emitted_on`, `summary`, ordered
  duplicate-free `changed_files`, and post-resolution `resolved_change_name`;
- `needs_input` — the same fields plus the worker's exact `question` and
  ordered `options` (and `resolved_change_name` after resolution);
- `failed` — the generic post-resolution closed `failure_class` and
  `unrecoverable` fields when resolution completed; and
- `cancelled` — the generic cancellation shape.

The sole allowed nonterminal extension is:

```yaml
event: progress
emitted_on: string
step_ids: string[]
changed_files: string[]
```

There is no spec `notice` result. Every payload follows
`@sai/orchestration/worker-core.md`; `emitted_on` remains worker-authored and
`changed_files` is unioned by the active coordinator in first-seen order.
Progress is nonterminal, `needs_input` pauses the same worker, and only
`completed`, `failed`, or `cancelled` closes the current lifecycle stretch.

### `SpecValidationReport`

A post-validation `completed` result MAY carry the phase-defined
`validation_report` extension. When present it has exactly this metadata-only
shape:

```yaml
validation_report:
  warnings:
    - spec_assertion: string
      other_side: string
      disagreement: string
```

`warnings` is ordered and may be empty. It contains no artifact contents. The
worker authors the report; the coordinator renders every warning after the
worker summary and before the feedback gate, using the canonical warning
format below. A worker never prints or formats this report itself. Explore
uses the same renderer before a supervised review or gate.

The canonical rendering for each warning is:

```text
⚠ Consistency warning — not auto-resolved; you decide which side is stale.

  • Spec assertion    : <spec_assertion>
  • <other_side label> : <other_side>
  • Disagreement      : <disagreement>
```

`other_side` carries the already-labelled source or proposal location; the
renderer preserves it verbatim and does not invent a second warning format.

## Entry-path delta

Standalone and supervised execution use the same `SpecResultUnion`,
`SpecWriteSurface`, progress ids, and pointer map. The only deliberate
differences are lifecycle presentation: standalone presents the interactive
artifact feedback gate and ends at its existing mandatory stop; Explore
supplies supervised gate parameters, owns auto-answer/escalation and review
state, and performs the existing phase transition to design. Neither path
creates design or implementation artifacts in the spec phase.

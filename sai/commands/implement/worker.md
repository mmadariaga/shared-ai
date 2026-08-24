# Implementation Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/implement/steps/common.md and keep it in force for the entire run.

Perform the complete technical `/sai-3-implement` phase. The `InvocationEnvelope`
contains exactly one request field, `arguments_value`; the retired wrapper-echo field has been removed, and
`arguments_value` has sole precedence. Write only the artifacts authorized by the
active step and return lifecycle metadata only. The technical generation rules
are not restated here:
`steps/common.md` and the coordinator-selected step file are the authoritative
instruction surface. A failed payload uses a concise `blocking_summary` as its
`summary`; `continuation_reference` remains binding-owned metadata and is never
worker-authored.

## Input

The worker envelope contains exactly:

```yaml
arguments_value: string
```

The binding may retain a dispatch identifier, but it is not worker input and
must never be written to an artifact or returned.

## Resolve and Verify

Use trimmed `arguments_value`, or run `openspec list --json` when it is empty and
resolve its zero/one/multiple outcomes. The
worker owns the exact established picker questions, options, and prerequisite
failure messages. Each input payload has a `question` and ordered options. The
closed outcomes are `completed`, `needs_input`, `failed`,
and `cancelled`. For one change ask `Use change '{name}'?`; for multiple
changes ask `Which change?`; this is the 0/1/N zero/one/multiple protocol. Do not
scan parent conversation history.

After resolution, check the CLI, OpenSpec directory and schema, then
`proposal.md`, `design.md`, and `tasks.md`, in that order. Make no file write
when a check fails. If the CLI is absent return `openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec`;
if OpenSpec is not initialized return `OpenSpec not initialized in this project. Run: openspec init`;
and if the schema is wrong return ``openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.``

Set `$ARGUMENTS` to the resolved name. Return `needs_input` for planning
questions, each complying with `@sai/policies/question-context.md`, continue the
same planning operation, return `cancelled` for a deliberate decline, and
return `failed` for blockers. Delegation and research rules belong to the
active step file and are not duplicated in this worker contract.

## Active Step Execution

Instruction stretches are delivered just-in-time, one step file at a time. Each progress-event continuation carries one pointer line — `Active step: <id> — follow <path>` — naming exactly the step to execute next; execute only that named step, following its file exactly, and never prefetch, open, or follow any other step instruction file. Step-file paths exist solely as coordinator continuation lines; this contract plus common.md is the sealed initial surface, and `prereqs-resolution` runs from it before the first progress event with the first delivered pointer targeting collapse-implemented-steps. A continuation without a pointer line (needs_input answer, recovery) leaves the active step unchanged in this continuous session. Steps never widen this contract: status returns, progress reporting, changed_files accounting, and failure classification apply unchanged while any step executes.

## Recovery

The shared runner and coordinator own recovery diagnosis, eligibility, and the
bounded ledger. On `continue_after_recovery`, resume this same worker without
re-resolution or replacement dispatch. Apply only the coordinator's ordered
`Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` diagnosis to
the authorized worker-owned correction surface
(`openspec/changes/{change-name}/implementation.md`), then rerun the active
verification before returning a terminal result. Recovery does not emit a
progress event, persist diagnosis metadata, widen the active step, or authorize
a different artifact. A recovery transport loss is handled by the shared
runner's recovery policy, never by inventing a replacement inside the worker.

## Progress Reporting

This phase declares a progress plan with exactly these canonical step ids, in
order:

 - `prereqs-resolution` — "Check prerequisites"
- `collapse-implemented-steps` — "Collapse implemented steps"
- `artifact-analysis` — "Analyze artifacts and validate decisions"
- `documentation-review` — "Review required documentation"
- `plan-generation` — "Write implementation.md"
- `validation` — "Validate implementation.md and the audit append"

Return exactly one progress event per completed batch after prerequisite checks
pass and change resolution completes, whenever one or more plan steps
complete, per `@sai/orchestration/worker-core.md`'s Nonterminal Result Transport: each event
is returned as the worker's result, the turn ends there, and the coordinator
resumes the worker with `continue_after_progress`. Composing the event as text
inside this session marks nothing. The startup act (prerequisite checks +
resolution) reports as one batch carrying `prereqs-resolution` and is the
Startup Handshake — return it before dispatching any `budget-subagent` or
`budget-explorer`, writing `implementation.md`, or beginning artifact analysis. Report ids in plan order; `changed_files`
lists every path written since the preceding result. On a first run the
collapse step is skipped entirely; the skipped `collapse-implemented-steps` id
folds into the next completed batch in plan order with no separate `skipped`
field. On a re-run, `collapse-implemented-steps` completes as its own batch.
The completed Step 5 write reports `plan-generation`; only after the
pre-delivery durable-artifact verification reports `validation` does planning
complete. A failed verification does not emit `validation`; return `failed`
with a concise blocking summary instead. Never emit a progress event before
resolution, in place of a terminal payload, during a `needs_input` pause, or
during a feedback turn — the run always closes with exactly one terminal
lifecycle status.

## Durable Artifact Completion Gate

Before returning `completed`, execute the canonical `validation` step. Its
pre-delivery verification is the sole technical source for the durable
`implementation.md` checks and the audit-append invariant. Completion therefore
requires a non-empty plan with every task in order, verification and STOP markers,
RED before GREEN for testable steps, interface conformance, the
required human-check encoding, and has executed no implementation step or
checked plan checkbox. It also requires exactly one new step for each audit artifact
present at the start of this run, numbered after the run-path baseline. A failed
verification does not emit `validation` and returns `failed` with a concise
blocking summary; do not claim planning completion.

Every lifecycle payload includes the current `changed_files` list. Completion
and every post-resolution payload include `resolved_change_name`. No payload
contains artifact contents, continuation identifiers, or binding metadata.

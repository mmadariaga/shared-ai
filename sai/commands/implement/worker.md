# Implementation Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.

Perform the complete technical `/sai-3-implement` phase. The `InvocationEnvelope`
contains exactly two fields. Write authorized
artifacts directly and return lifecycle metadata only. A failed payload uses a
concise `blocking_summary` as its `summary`; `continuation_reference` remains
binding-owned metadata and is never worker-authored.

## Input

The envelope contains exactly:

```yaml
wrapper_echo_value: string
arguments_value: string
```

The binding may retain a dispatch identifier, but it is not worker input and
must never be written to an artifact or returned.

## Resolve and Verify

Wrapper-echo precedence is authoritative: use trimmed non-empty wrapper echo before arguments. Otherwise use arguments,
or run `openspec list --json` and resolve its zero/one/multiple outcomes. The
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

Set `$ARGUMENTS` to the resolved name, fetch `@skills/budget/SKILL.md`, then
fetch `@sai/commands/implement/invocation.md` and follow it. Return
`needs_input` for planning questions, each complying with `@sai/policies/question-context.md`, continue the same planning operation,
return `cancelled` for a deliberate decline, and return `failed` for blockers.
Use `budget-subagent` for existing-plan simplification and rerun-new-element
research, and `budget-explorer` for ADR-index cold-build reads.

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

Before completion, verify the durable `implementation.md` is non-empty,
contains every task in order, includes verification and STOP markers, has RED
before GREEN for testable steps, conforms to interfaces, uses the required
human-check encoding, and has executed no implementation step or checked plan
checkbox.

Additionally verify the audit-derived step append: for every audit artifact
present at the start of the run (among `review.md`, `security.md`,
`performance.md`, and `accessibility.md`), the run SHALL have appended exactly
one corresponding step, numbered strictly after the run-path baseline — the
highest `#### Step N:` number in the generated plan on the first-run path, or
the highest `#### Step N:` number present in `implementation.md` at the start
of the run and captured before any write on the re-run path. A step appended by
an earlier run does NOT satisfy this check (the re-run contract appends one new
step per artifact on every re-run with no dedup). The append itself is executed
and repaired by the pre-delivery self-check of the `audit-artifact-ingestion`
capability (the first stage of the two-stage design); this gate is the second
stage and the last resort — when a required append is still missing at
completion time after that self-check has run, return `failed` with a concise
blocking summary and do not claim planning completion. The chat confirmation of
the existing "Discarded findings SHALL be surfaced in chat for conversational
confirmation" requirement is NOT part of this gate: it is conversational-only
by design (no approval key is written, and `implementation.md` carries no trace
of a chat emission), so no durable record exists for this gate to verify.

Every lifecycle payload includes the current `changed_files` list. Completion
and every post-resolution payload include `resolved_change_name`. No payload
contains artifact contents, continuation identifiers, or binding metadata.

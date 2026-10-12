<TASK>

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/policies/fast-track-flag.md
Fetch @sai/policies/no-commit-guard.md
Fetch @sai/policies/bounded-recovery.md
Fetch @sai/policies/todo-structure.md
Fetch @sai/policies/stage-machine.md
Fetch @sai/policies/tool-resolution.md
Fetch @sai/commands/implement/steps/common.md

## Implementation coordinator

Own change resolution, common planning work, category routing, final integration,
verification, and the sole write to `implementation.md`. This phase uses the
shared runner's validation, ready handshake, input, recovery, and changed-files
contracts, with the phase-owned parallel result loop below replacing its
single-worker dispatch and immediate-failure close. Run no implementation Step
and no mutating git command except no-commit-guard's authorized remediation.
No separate integration agent is dispatched. The same adapter runs standalone,
inside `/sai-build`, and inside explore's Plan - Unattended route.
The shared protocol is @sai/orchestration/command-runner.md; its ordinary
worker progress-event continuation applies only where a child declares progress.

Parse fast-track and print its banner once on standalone activation. A chained
supervisor supplies `fast_track_active` and owns the banner; keep that state
invocation-scoped, separate from `arguments_value`. Resolve the cleaned change
name with the established 0/1/N protocol: trimmed nonempty input, otherwise
`openspec list --json`; one asks `Use change '{name}'?`, many ask `Which change?`.
Reuse a supervisor-resolved name without asking again. Check `proposal.md`,
`design.md`, `tasks.md` in order and record existing-plan presence before writing.
Run no OpenSpec environment prerequisite check.
Do not send the raw `--fast-track` token to the worker. Carry already-authorized
common decisions in `common_context`; category workers do not own those gates.

## Common preparation

Declare `progress_plan` as this immutable canonical list and render it before routing, per todo-structure:
- `prereqs-resolution` — "Resolve change"
- `collapse-implemented-steps` — "Collapse implemented steps"
- `artifact-analysis` — "Analyze artifacts and validate decisions"
- `documentation-review` — "Review required documentation"
- `plan-generation` — "Write implementation.md"
- `validation` — "Validate implementation.md and the audit append"

The coordinator marks its own completed common work; children emit no progress
events. This phase does not declare a worker step machine. Panel degradation
uses the active harness's existing one-time route and the active adapter's
panel-render binding. If the declared panel tool is
unavailable at runtime, record its notice exactly once and disable later panel
calls for this invocation; other contract errors remain failures.
Preserve this phase plan
across continuation and reconstruction in coordinator state, not in a child
task or reconstruction field. Record each completed common milestone through
`worker-report-validator.js validate --kind progress` with the standard
`event: progress`, completed `step_ids`, and written `changed_files` shape.
These are coordinator-authored observations of its own work, never worker
progress returns. Use only the validator response's `received_at` for milestone
stamps. Reconcile all unmarked steps completed only after successful publication;
failed/cancelled/needs_input leave the last rendered state and stamps unchanged.

Follow the existing step library in that order, loading each file only when its
work starts. Resolution runs inline above; the next entry paths are:

| Milestone | Instruction path (fetch only at entry) |
|---|---|
| collapse-implemented-steps | @sai/commands/implement/steps/collapse-implemented-steps.md |
| artifact-analysis | @sai/commands/implement/steps/artifact-analysis.md |
| documentation-review | @sai/commands/implement/steps/documentation-review.md |
| plan-generation | @sai/commands/implement/steps/plan-generation.md |
| validation | @sai/commands/implement/steps/validation.md |

Execute common steps yourself, once, retaining their planning,
ADR/DDR culture/permission, audit classification, documentation, and fast-track
authorization rules. Present any step's `needs_input` through the native picker.
Where those files say worker, progress event, or write implementation.md, the
owner is now this coordinator; report progress locally and stage plan changes
in the run candidate, not the durable plan. Category workers do not make shared
decisions or amend inputs. Their reported input defects return to you for the
existing defective-sai-2 authorization rule; sai-1 defects still escalate.

Before preparation, preserve the original plan and interfaces contents in
invocation state. On a rerun, collapse and preservation operate on a candidate
copy; keep every unfinished Step, code block, checkbox, and appendix unchanged
under `steps/rerun-preservation.md`. Stage interface pruning until successful
delivery. An existing plan is never regenerated from the template. Capture the
audit baseline before any candidate edit and append each eligible audit exactly
once, with its interface contracts, under the existing audit-ingestion rules.

## Category tasks

Resolve `planning-parts.js` under tool-resolution and run
`node <tool> start --change {name} --cwd <project-root>` after common preparation
and any authorized input amendments. Its CATEGORY_AGENTS is the sole mapping;
route by the tasks.md category, never by paths, context, difficulty, or inferred
model ability. Missing or invalid categories stop before any worker activates,
naming affected Steps. Do not use other as a fallback. Retain the returned run
identity, input hashes, assignments, and exact artifact paths. Each nonempty
assignment activates exactly one worker for all its Steps; empty agents do not
activate. backend combines backend/data, other combines docs/other.

Load each required installed binding from the bootstrap. Check its effective
project-local agent definition, configured model, and required skills before
task disclosure. An unavailable resource names the worker and resource and
blocks that task; never substitute a model or another agent. All five shipped
agents share one contract, skills, and the previous sai-3 default model per
harness. Project-local definitions may customize models and skills without
changing ownership, routing, or final format.

Dispatch every required worker's zero-task ready call in one native concurrent
batch. Claude Code uses
the matching managed `Agent(subagent_type: ..., run_in_background: true)` calls
without per-spawn model selection; opencode uses concurrent `task` calls with
their managed `subagent_type`, without a background parameter. Capture every
handle and validate each `event: ready` before any task disclosure. If ready or
handle capture fails, open no guard window and disclose no task; follow bounded
startup recovery first. After all batch handles are captured and ready returns
validated, snapshot once immediately before task disclosure when no window is
running. Retain that baseline as `guard_base` in coordinator state. Reuse an
already-running window; never derive a separate baseline per child. Pair snapshot
and verify under the no-commit-guard policy at each human/mutation/run boundary,
including failure close, and use its violation handling.
Then disclose each worker's one complete task concurrently through its same-worker
continuation. The opaque string
`arguments_value` encodes JSON with `change`, `run`, `agent`, `inputs`, ordered
`steps`, `artifact`, and `common_context` (shared decisions, documentation
evidence, dependencies, manual/deferred-check allocation, rerun preservation
state, and audit ownership). It supplies all the assigned Steps at once. No
worker receives a per-Step execution schedule. Shared documents remain readable.
Workers write only their exact assigned part, never production or final files.

## Parallel result loop and recovery

Bind a child adapter per assignment with `original_envelope` equal to that
complete opaque task string, `dispatch_operation` and `continuation_operation`
from its installed category binding, no nonterminal extensions or progress
plan, `extension_handlers: {}`, and `recovery_policy: true`. Its
`replacement_reconstruction_fields` contain the original task, resolved name,
ordered `opaque_input_history` containing only exact `question`, ordered
`options`, and selected `answer_value`, current run identity, and assignment. Child
`terminal_navigation` records the outcome only; the phase terminal navigation
is the positional completion/transition defined below, after verified publish.

Maintain one handle, status, input history, and bounded-recovery ledger per
worker. Validate closed lifecycle statuses and ordered duplicate-free
`changed_files` through the runner. `continuation_reference` is binding-owned.
A `needs_input` pauses only that worker: present its question, forward the answer
unchanged, and continue the same worker. Never cancel siblings because one
worker fails, is cancelled, needs input, or loses transport. Collect every
sibling's terminal result and retain all valid parts. Close guard windows at
human/mutation/run boundaries per no-commit-guard, not independently per child.

A `needs_input` answer-only continuation forwards only the selected answer_value
through the captured binding, without reconstructing an InvocationEnvelope.
Await that same worker's next payload and re-present repeated requests. Only a
failed continuation enters replacement recovery, with the complete original
task and reconstruction fields; binding identifiers are not worker input.
When the captured continuation is lost, the binding's at most one replacement
rule still applies; it grants no new recovery budget. The replacement fields
include a durable-artifact reconstruction instruction naming run.json and the
exact assigned part to read. Do not include artifact contents in that instruction.

`recovery_policy: true`: apply existing eligibility, diagnosis, and bounded
budgets independently. The authorized child recovery surface is its exact part,
not implementation.md. Reconstruct a replacement with the original complete
task, resolved name, exact input history, assignment, and current run identity;
never silently reroute or change its model. A stale input digest invalidates the
run and requires a fresh preparation/routing pass; preserve the previous run.
On any unresolved failure, cancellation, missing or invalid part, report the
agent, missing Steps, blocker, and retained paths after siblings finish. Keep
the previous implementation.md intact, print no completion, and do not activate
apply. Retained results can be reused only after verifying current run/input
identity and assignment, never by matching a filename alone.

## Integration and durable completion

Create run-owned `header.md` from the unchanged implementation plan template
(including the single full-suite command). On rerun use the preserved header.
Create `tail.md` for preserved appendices and coordinator-owned audit steps.
Run `assemble --run <run> --cwd <project-root>` to enforce exact assigned-Step
coverage, identity, original numbering, and tasks.md ordering. Inspect the whole
candidate for interface conformance, cross-category dependency compatibility,
first-observable/deferred functional checks, manual/migration carry-through,
and all common Hard Rules. Resolve incompatibilities through same-worker part
corrections without widening assignments; preserve valid sibling parts.

Execute `steps/validation.md` against the candidate before publication, using
the returned validation_cwd for Apply's unchanged `preflight` command. Semantic
interface and test-impact checks remain your responsibility; hashes and parser
success do not replace them. Repair parts or coordinator-owned header/tail and
reassemble/reverify. Run-owned temporary writes are permitted planning surfaces.
Require the complete set, the executable preflight, all semantic checks, rerun
preservation, and audit-append invariant before delivery. No partial plan is
complete. Publish with `node <tool> publish --run <run> --sha256 <verified-hash>
--cwd <project-root>`. It checks current inputs and candidate identity, reruns
preflight, then atomically replaces the durable plan and removes only exact
owned temporary files. Preserve unrelated files, other runs, and every failed
run; never recursively delete the temporary directory. Write prepared interface
pruning only after verification; record every authorized input correction and
fast-track note under the existing rules. Report all written paths in one
ordered duplicate-free union, even temporary paths cleaned after success.

Every post-resolution child result requires `resolved_change_name` equal to the
assigned change, string `summary`, and string-list `changed_files`; reject any
missing required field. The payload status must be exactly one of `completed`,
`needs_input`, `failed`, or `cancelled`; needs_input requires its question and
ordered options. The coordinator retains the resolved name, fast-track state,
and changed-file union across all input, recovery, and segment transitions.

Only successful publication completes plan-generation and validation. Print a
concise summary and changed-file union. Standalone or final segment prints
exactly `Implementation plan done in openspec/changes/{name}/. Review and run \`/sai-4-apply {name}\` (--fast-track) **in a new chat** when ready.` and stops.
Stop immediately after that standalone completion message. On `failed`, print
the blocking summary and accumulated changed-file list, without the completion
message and without a composition transition. On `cancelled`, print the
clean-stop summary and accumulated changed-file list, without claiming completion
and without a composition transition. A child's completed result alone invokes
neither transition nor completion; only the coordinator's verified publication
invokes the phase's positional terminal_navigation.
A non-final composition segment invokes only its authorized successor
transition, with no intermediate approval or standalone stop. sai-4, RED/GREEN
selection, and the final implementation.md format remain unchanged.

</TASK>

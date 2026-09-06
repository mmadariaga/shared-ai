# Spec Proposal Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/policies/spec-phase-contract.md and keep it in force for the entire run.
Fetch @sai/commands/spec/steps/common.md and keep it in force for the entire run.

Specification of the worker contract for the spec phase. No new normative rules originate here; this file defines the worker's lifecycle envelope and step-execution model.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; the retired wrapper-echo field has been removed, and no third envelope field carries the marker. Do not scan parent conversation history. Repeatedly strip leading lines whose trimmed content is exactly the bare `--supervised` flag from `arguments_value`. Set invocation-scoped `supervised` to `true` if and only if at least one such leading line was consumed. The first line that is not that flag opens the request verbatim, inclusive; from that point onward, later lines and substrings containing `--supervised` are request content and are not parsed as flags. **Degenerate case:** if stripping the leading `--supervised` flag lines leaves no request or only whitespace (bare `--supervised` with no change request), fail validation before change resolution. Creation and refinement are distinct entries. Creation requires the crystallized `Ready to Propose` block judged by concepts, never byte-exact: `What`, `Why`, `Capabilities in scope`, `Decisions & Rationale`, `Alternatives Considered`, `Trade-offs Accepted`, `Key constraints`, `Terms`, `Edge Cases`, `Implementation Details` (with `Change name` as the resolution source). When the request carries those concepts, resolve the change name from the block's `Change name` concept and proceed as creation. Re-entry or refinement on existing artifacts — an existing change directory already holding `proposal.md` or `specs/**` — needs no block: a simple prompt suffices, and hand-created pre-existing changes with artifacts refine through this path. Otherwise STOP before change resolution and print exactly: "STOP: creation requires the crystallized Ready to Propose block. Run /sai-explore to mature the idea, then paste the block into a new chat with /sai-1-spec." This covers an empty request, a name-only request, and an incomplete block with any listed concept missing; a hand-created change directory with no `proposal.md` or `specs/**` crystallizes first through the same STOP. Never fetch `@sai/policies/change-picker.md` in this phase; there is no change-picker fallback and no name-only creation path.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow` per `@sai/policies/prereqs-check.md`, then resolve or
create the requested spec change according to the existing `sai-1-spec`
behavior. Return exact prerequisite failures with their STOP-and-print literals from the check policy and make no write on failure.
Every payload after resolution includes `resolved_change_name`; pre-resolution
payloads omit it.

## Progress Reporting

Use the canonical `progress_plan`, `step_pointer_map`, and progress result shape from `@sai/policies/spec-phase-contract.md`. After prerequisite checks pass and change resolution completes, return the startup progress event for `prereqs-and-change` before dispatching any subagent, reading beyond resolution, writing an artifact, or beginning research. The research batch returns `research`; the completed `proposal.md` write returns `proposal`; the completed `specs/**` write returns `specs`; and artifact validation plus decision-summary derivation returns `validation`. A `review` event is returned only for a valid externally supplied `sai-explore` findings block whose base-form `Summary: High=0 Medium=<count> Low=<count>` explicitly reports `High=0`, and only while `review` is unmarked.

Progress events are returned lifecycle results, not text written into the
worker session. Every event uses the closed progress shape and worker-authored
`emitted_on`. Progress step ids are reported in canonical plan/map order and
only when newly complete; marks are monotonic and the worker never reopens or
re-reports an earlier id. The coordinator alone applies visual rendering,
pointer routing, milestone stamps, `changed_files` unioning, and result
validation. Progress never replaces the one terminal lifecycle status. Explore may suppress the visual plan while retaining the pointer map. The worker does not dispatch or own an artifact reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes.

## Active Step Execution

Instruction stretches are delivered just-in-time, one step file at a time.
Each progress-event continuation carries the pointer selected by the
coordinator's canonical map — `Active step: <id> — follow <path>` — and the
worker executes only that named file. Never prefetch, open, or follow another
step instruction file. The worker contract plus `common.md` is the sealed
initial surface; `prereqs-and-change` runs from it before the first progress
event and the first delivered pointer targets `research`. A continuation
without a pointer line (artifact feedback or recovery) leaves the active step
unchanged in this continuous session. Steps never widen the lifecycle,
changed-files, result, or failure rules.

## Spec Work

Execute only the active step named by the coordinator's most recent pointer.
Own the proposal/spec writes, permitted glossary updates, self-consistency and
source-grounding checks, artifact verification, decision-summary derivation,
and feedback edits allowed by the canonical `SpecWriteSurface`. Write no
forbidden artifact. Return `needs_input` for planning questions, each
complying with `@sai/policies/question-context.md`, `cancelled` for a
deliberate decline, and `failed` for blockers. For coordinator-forwarded
artifact feedback, process the supplied feedback text using the shared gate
rules; MUST NOT emit, re-present, or duplicate the feedback-text prompt.

The validation step returns the metadata-only `validation_report` extension
defined by the phase contract when warnings exist (and an empty warning list
when there are none). Return lifecycle metadata and that extension only; never
return artifact contents, continuation identifiers, binding metadata, or a
dispatch identifier. `changed_files` is ordered and duplicate-free.

### External findings consumption

For proposal/spec review, consume only an externally supplied `sai-explore`
findings block; this worker does not dispatch or own a reviewer. Process every
finding under `@sai/policies/artifact-review-contract.md` and
`@sai/policies/artifact-feedback-gate.md`. Require the shared contract's
base-form `Summary: High=<count> Medium=<count> Low=<count>` and an explicit `High=0` before treating the block as review evidence; never infer `High=0` from missing, malformed, or other summary text. Findings may edit only
`proposal.md` and `specs/**`. Report every discarded item with a specific
reason. Accepted edits trigger pre-completion verification and decision-summary recomputation from current artifacts without reopening or re-emitting the already completed `proposal`, `specs`, or `validation` progress ids.

Never create a reviewer, a worker-owned findings loop, or automatic
review/retry machinery, and never process a user-requested reviewer pass. With
no external findings block, proceed to the ordinary pre-gate terminal.
Interactive or omitted mode leaves the coordinator-owned gate at iteration `0`, while supervised mode auto-proceeds through the deferred gate; the worker does not receive, present, branch on, or otherwise handle `mode`. Preserve the
phase contract's result union.

### Post-resolution failure classification and recovery

After change resolution, every `status: failed` result is worker-authored and
closed under the failure-class vocabulary in
`@sai/orchestration/worker-core.md`, with a boolean `unrecoverable` and a
concrete English summary describing observed evidence. The summary is
evidence, not raw output: identify the affected artifact or operation, the
failed condition, and the consequence without returning logs, tracebacks,
command output, or file contents. Pre-resolution failures keep the
pre-resolution envelope and therefore omit those fields.

Classify proposal/spec generation or write failures as `generation-error`
unless a more specific closed class applies. Classify validation, consistency,
requirement-scenario, or artifact-verification failures as
`validation-failed`, naming the failed check and affected `proposal.md` or
`specs/**`. A contradiction with the spec-only write surface, including an
attempted write to a forbidden artifact, is `blocking-contradiction`; set
`unrecoverable: true` only when the evidence shows that continuing is unsafe.
The remaining worker-core classes retain their generic meanings and require
concrete non-raw evidence.

On `continue_after_recovery`, resume the same worker without re-resolution or
replacement dispatch. Apply only the coordinator's ordered diagnosis —
`Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` — and make
only the authorized correction it names. Do not infer a new repair, edit a
forbidden artifact, or persist the diagnosis, an attempt count, or other
recovery metadata. Re-run spec verification after the correction; return
`completed` only when it passes. If verification still fails, return a
post-resolution `failed` result with the closed classification, boolean
`unrecoverable`, and concrete evidence. Recovery never emits a recovery
progress id or progress event; the canonical plan, external-findings handling,
feedback flow, validation report, and ordinary terminal rules remain
unchanged.

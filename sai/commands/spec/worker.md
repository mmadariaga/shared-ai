# Spec Proposal Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/policies/spec-phase-contract.md and keep it in force for the entire run.
Fetch @sai/commands/spec/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string, `arguments_value`, and reads nothing from parent conversation history.

1. **Supervised flag.** Repeatedly strip leading lines whose trimmed content is exactly the bare `--supervised` flag. Set invocation-scoped `supervised` to `true` if and only if at least one such line was consumed. The first line that is not that flag opens the request verbatim, inclusive; later lines and substrings containing `--supervised` are request content and are not parsed as flags. **Degenerate case:** if stripping leaves no request or only whitespace (bare `--supervised` with no change request), fail validation before change resolution.
2. **Creation and refinement are distinct entries.**
   - **Creation** requires the crystallized `Ready to Propose` block, judged by concepts, never byte-exact: `What`, `Why`, `Capabilities in scope`, `Decisions & Rationale`, `Alternatives Considered`, `Trade-offs Accepted`, `Key constraints`, `Terms`, `Edge Cases`, `Implementation Details`, with `Change name` as the resolution source. When the request carries those concepts, resolve the change name from the block's `Change name` concept and proceed as creation.
   - **Refinement** targets an existing change directory that already holds `proposal.md` or `specs/**`, and needs no block: a simple prompt suffices, including for hand-created changes with artifacts.
   - **Otherwise** STOP before change resolution and print exactly: "STOP: creation requires the crystallized Ready to Propose block. Run /sai-explore to mature the idea, then paste the block into a new chat with /sai-1-spec." This covers an empty request, a name-only request, an incomplete block with any listed concept missing, and a hand-created change directory with no `proposal.md` or `specs/**`.

   This phase resolves names only through the block or the existing directory and never fetches `@sai/policies/change-picker.md`: there is no change-picker fallback and no name-only creation path.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow` per `@sai/policies/prereqs-check.md`. On a failure, return the check policy's exact STOP-and-print literal and write nothing. Then resolve the change per § Invocation Envelope. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Progress Reporting

Report the canonical `progress_plan` ids from `@sai/policies/spec-phase-contract.md` as progress events, and follow the coordinator-provided step-machine pointer for routing. Progress step ids are reported in canonical plan order, each once and only when newly complete — marks are monotonic, and an earlier id is never reopened or re-reported:

- `prereqs-and-change` — once prerequisite checks pass and change resolution completes, return the startup progress event for `prereqs-and-change` before dispatching any subagent, reading beyond resolution, writing an artifact, or beginning research.
- `research` — the research batch returns `research`.
- `proposal` — the completed `proposal.md` write returns `proposal`.
- `specs` — the completed `specs/**` write returns `specs`.
- `validation` — artifact validation plus decision-summary derivation returns `validation`.
- `review` — the review step returns `review` under the conditions it states.

Progress events are returned lifecycle results, never text in the worker session, and never replace the one terminal lifecycle status. The coordinator alone renders progress, routes pointers, stamps milestones, unions `changed_files`, and validates results.

## Active Step Execution

Instructions arrive just-in-time, one step file at a time, per the step delivery rule in `steps/common.md`: execute only the file named by the most recent `Active step:` pointer. This contract plus `common.md` is the sealed initial surface; `prereqs-and-change` runs from it before the first progress event, and the first delivered pointer targets `research`. Steps never widen the lifecycle, changed-files, result, or failure rules.

## Spec Work

Own the proposal/spec writes, permitted glossary updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits, all inside the canonical `SpecWriteSurface`. Return `needs_input` for planning questions, `cancelled` for a deliberate decline, and `failed` for blockers.

For coordinator-forwarded artifact feedback, process the supplied feedback text under the shared gate rules; the worker MUST NOT emit, re-present, or duplicate the feedback-text prompt. The worker does not receive, present, branch on, or otherwise handle `mode`.

Return lifecycle metadata and the phase contract's `validation_report` extension only; `changed_files` is ordered and duplicate-free.

### External findings consumption

The phase reviews only an externally supplied `sai-explore` findings block, handled by the review step; the worker dispatches no reviewer of its own.

### Post-resolution failure classification and recovery

After change resolution, every `status: failed` result is worker-authored and closed under the failure-class vocabulary in `@sai/orchestration/worker-core.md`, with a boolean `unrecoverable` and a concrete English summary of observed evidence: the affected artifact or operation, the failed condition, and the consequence — never logs, tracebacks, command output, or file contents. Pre-resolution failures keep the pre-resolution envelope and omit those fields.

- Proposal/spec generation or write failures are `generation-error` unless a more specific closed class applies.
- Validation, consistency, requirement-scenario, or artifact-verification failures are `validation-failed`, naming the failed check and the affected `proposal.md` or `specs/**`.
- A contradiction with the spec-only write surface, including an attempted write to a forbidden artifact, is `blocking-contradiction`; set `unrecoverable: true` only when the evidence shows that continuing is unsafe.
- The remaining worker-core classes keep their generic meanings and require concrete non-raw evidence.

On `continue_after_recovery`, resume the same worker without re-resolution or replacement dispatch. Make only the authorized correction named by the coordinator's ordered diagnosis — `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` — and persist no diagnosis, attempt count, or other recovery metadata. Re-run spec verification after the correction: return `completed` only when it passes, otherwise a post-resolution `failed` result with the closed classification, boolean `unrecoverable`, and concrete evidence. Recovery never emits a recovery progress id or progress event and leaves the canonical plan, external-findings handling, feedback flow, validation report, and ordinary terminal rules unchanged.

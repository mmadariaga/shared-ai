# Spec Proposal Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/spec/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; the retired
wrapper-echo field has been removed, and no third envelope field carries the marker. Do not scan parent conversation history. Repeatedly strip leading lines
whose trimmed content is exactly the bare `--supervised` flag from
`arguments_value`. Set invocation-scoped `supervised` to `true` if and only if
at least one such leading line was consumed. The first line that is not that flag
opens the request verbatim, inclusive; from that point onward, later lines and
substrings containing `--supervised` are request content and are not parsed as
flags. Later lines and substrings containing `--supervised` are request content and are not parsed as flags. If stripping the leading flag lines leaves no request or only whitespace,
fail validation before change resolution. If `arguments_value` is empty,
Fetch @sai/policies/change-picker.md and follow it exactly to resolve the
change name; do not duplicate its picker logic inline.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow`, then resolve or create the requested spec change according to the existing inline `sai-1-spec` behavior. Return exact prerequisite failures and make no write on failure. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Progress Reporting

This phase declares exactly the following canonical progress plan, in order:

- `prereqs-and-change` — "Check prerequisites"
- `research` — "Research the change request"
- `proposal` — "Write proposal.md"
- `specs` — "Write specs/**"
- `validation` — "Validate artifacts and derive the decision summary"
- `review` — "Review artifacts"

Progress events are returned lifecycle results, not text written into the worker session. After prerequisite checks pass and change resolution completes, return the startup progress event for `prereqs-and-change` before dispatching any subagent, reading beyond resolution, writing an artifact, or beginning research. The research batch returns `research`; the completed `proposal.md` write returns `proposal`; the completed `specs/**` write returns `specs`; and artifact validation plus decision-summary derivation returns `validation`. A `review` event is returned only for a valid externally supplied `sai-explore` findings block whose base-form `Summary: High=0 Medium=<count> Low=<count>` explicitly reports `High=0`, and only while `review` is unmarked. Every event uses the closed progress shape and worker-authored `emitted_on`; the coordinator resumes the worker with `continue_after_progress`.

Progress step ids are reported in plan order and only when newly complete. Progress marks are monotonic: the worker never reopens or re-reports an earlier id, and the coordinator alone renders the plan, marks reported ids, unions `changed_files`, and renders any milestone stamp from `emitted_on` under its rendering rules. Progress events never replace the one terminal lifecycle status. The worker does not dispatch or own an artifact reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes. The supervised selector Explore has no adapter progress plan; its `reviewed-sai-1` idea-list item is its evidence surface rather than a routed worker progress step.

## Active Step Execution

Instruction stretches are delivered just-in-time, one step file at a time. Each progress-event continuation carries one pointer line — `Active step: <id> — follow <path>` — naming exactly the step to execute next; execute only that named step, following its file exactly, and never prefetch, open, or follow any other step instruction file. Step-file paths exist solely as coordinator continuation lines; this contract plus common.md is the sealed initial surface, and `prereqs-and-change` runs from it before the first progress event with the first delivered pointer targeting research. A continuation without a pointer line (artifact feedback, recovery) leaves the active step unchanged in this continuous session. Steps never widen this contract: status returns, progress reporting, changed_files accounting, and failure classification apply unchanged while any step executes.

## Spec Work

Before proposal generation, complete structured research for every resolved request until the existing approximately 80% confidence boundary is reached. Apply the same boundary when a `Ready to Propose` handoff supplies Research Leads; validate and extend those leads rather than treating them as settled scope or a replacement for independent research.

Execute only the active step named by the coordinator's most recent `Active step:` pointer line, following that step file exactly. Own proposal/spec writes, permitted root `GLOSSARY.md` updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits. Write no `design.md`, `tasks.md`, or implementation artifact. Return `needs_input` for planning questions, each complying with `@sai/policies/question-context.md`, `cancelled` for a deliberate decline, and `failed` for blockers. For coordinator-forwarded artifact feedback, process forwarded feedback using the supplied feedback text and shared gate rules; MUST NOT emit, re-present, or duplicate the feedback-text prompt.

Pre-completion verification is executed by the validation step's file when its pointer arrives. Return only lifecycle metadata. `changed_files` is ordered and duplicate-free. Never return artifact contents, continuation identifiers, binding metadata, or a dispatch identifier.

### External findings consumption

For proposal/spec review, consume only an externally supplied `sai-explore` findings block; this worker does not dispatch or own a reviewer. Process every finding under `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md`. Require the shared contract's base-form `Summary: High=<count> Medium=<count> Low=<count>` and an explicit `High=0` before treating the block as review evidence; never infer `High=0` from missing, malformed, or other summary text. Findings may edit only `proposal.md` and `specs/**`. Report every discarded item with a specific reason. Accepted edits trigger pre-completion verification and decision-summary recomputation from current artifacts without reopening or re-emitting the already completed `proposal`, `specs`, or `validation` progress ids.

Never create a reviewer, a worker-owned findings loop, or any automatic review/retry machinery, and never process a user-requested reviewer pass. With no external findings block, proceed to the ordinary pre-gate terminal. Interactive or omitted mode leaves the coordinator-owned gate at iteration `0`, while supervised mode auto-proceeds through the deferred gate; the worker does not receive, present, branch on, or otherwise handle `mode`. Preserve the existing terminal payload rules.

### Post-resolution failure classification and recovery

After change resolution, every `status: failed` result is worker-authored and
closed: it includes exactly one `failure_class` from
`blocking-contradiction|validation-failed|generation-error|dispatch-failed|envelope-contract-violation|unclassified-worker-fault`, a boolean `unrecoverable`, and a concrete English `summary` describing the observed evidence. The summary is evidence, not raw output: identify the affected artifact or operation, the failed condition, and the consequence without returning logs, tracebacks, command output, or file contents. Pre-resolution failures keep the pre-resolution envelope and therefore do not receive these fields.

Classify a proposal/spec generation or write failure as `generation-error`
unless a more specific closed class applies. Classify validation, consistency,
requirement-scenario, or artifact-verification failures as
`validation-failed`, with the failed check and affected `proposal.md` or
`specs/**` named in the evidence. A contradiction with the requested
spec-only scope, including an attempted write to `design.md`, `tasks.md`,
`interfaces.md`, `implementation.md`, tests, or another forbidden artifact, is
`blocking-contradiction`; set `unrecoverable: true` only when the evidence
shows that continuing would be unsafe. `dispatch-failed`,
`envelope-contract-violation`, and `unclassified-worker-fault` retain their
closed worker-core meanings and still require concrete non-raw evidence.

The authorized write surface is unchanged and closed: `proposal.md`,
`specs/**`, and the permitted repository-root `GLOSSARY.md` only. The worker
never writes `design.md`, `tasks.md`, `interfaces.md`, `implementation.md`,
tests, recovery metadata, recovery counters, or any other artifact. A
coordinator diagnosis does not widen this surface, and the coordinator writes
nothing during worker recovery.

On `continue_after_recovery`, resume the same worker without re-resolution or
replacement dispatch. Apply only the coordinator's ordered diagnosis —
`Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` — and make
only the authorized proposal/spec or permitted glossary correction it names.
Do not infer a new repair, edit a forbidden artifact, or persist the diagnosis,
an attempt count, or other recovery metadata. Re-run the existing spec
verification after the correction; return `completed` only when that
verification passes. If verification still fails, return a post-resolution
`failed` result with the closed classification, boolean `unrecoverable`, and
concrete evidence. Recovery never emits a recovery progress id or recovery
progress event; the canonical progress plan, external-findings
handling, feedback flow, and ordinary terminal rules remain unchanged.

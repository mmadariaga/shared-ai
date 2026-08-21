# Spec Proposal Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings: `wrapper_echo_value` and `arguments_value`; no third envelope field carries the marker. Select the trimmed `wrapper_echo_value` when it is non-empty, otherwise select `arguments_value`, and do not scan parent conversation history. On the selected source, repeatedly strip leading lines whose trimmed content is exactly the bare `--supervised` flag. Set invocation-scoped `supervised` to `true` if and only if at least one such leading line was consumed. The first line that is not that flag opens the request verbatim, inclusive; from that point onward, later lines and substrings containing `--supervised` are request content and are not parsed as flags. If stripping the leading flag lines leaves no request or only whitespace, fail validation before change resolution. If both envelope values are empty, run `openspec list --json` and apply the established zero/one/multiple picker: no changes fails; one asks `Use change '{name}'?` with ordered yes/no options; multiple asks `Which change?` with CLI-order options and repeats invalid input without a retry cap.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow`, then resolve or create the requested spec change according to the existing inline `sai-1-spec` behavior. Return exact prerequisite failures and make no write on failure. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Progress Reporting

This phase declares exactly the following canonical six-step progress plan, in order:

- `prereqs-and-change` — "Check prerequisites"
- `research` — "Research the change request"
- `proposal` — "Write proposal.md"
- `specs` — "Write specs/**"
- `validation` — "Validate artifacts and derive the decision summary"
- `review` — "Review artifacts"

Progress events are returned lifecycle results, not text written into the worker session. After prerequisite checks pass and change resolution completes, return the startup progress event for `prereqs-and-change` before dispatching any subagent, reading beyond resolution, writing an artifact, or beginning research. The research batch returns `research`; the completed `proposal.md` write returns `proposal`; the completed `specs/**` write returns `specs`; and artifact validation plus decision-summary derivation returns `validation`. A `review` event is returned only for a valid externally supplied `sai-explore` findings block whose base-form `Summary: High=0 Medium=<count> Low=<count>` explicitly reports `High=0`, and only while `review` is unmarked. Every event uses the closed progress shape and worker-authored `emitted_on`; the coordinator resumes the worker with `continue_after_progress`.

Progress step ids are reported in plan order and only when newly complete. Progress marks are monotonic: the worker never reopens or re-reports an earlier id, and the coordinator alone renders the plan, marks reported ids, unions `changed_files`, and renders any milestone stamp from `emitted_on` under its rendering rules. Progress events never replace the one terminal lifecycle status. The worker does not dispatch or own an artifact reviewer, an automatic review loop, review counters, reviewer retry outcomes, or user-requested reviewer passes. The supervised selector Explore has no adapter progress plan; its `reviewed-sai-1` idea-list item is its evidence surface rather than a routed worker progress step.

## Spec Work

Before proposal generation, complete structured research for every resolved request until the existing approximately 80% confidence boundary is reached. Apply the same boundary when a `Ready to Propose` handoff supplies Research Leads; validate and extend those leads rather than treating them as settled scope or a replacement for independent research.

Set `$ARGUMENTS` to the resolved request, fetch `@sai/commands/spec/invocation.md`, and follow it exactly. Own proposal/spec writes, permitted root `GLOSSARY.md` updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits. Write no `design.md`, `tasks.md`, or implementation artifact. Return `needs_input` for planning questions, each complying with `@sai/policies/question-context.md`, `cancelled` for a deliberate decline, and `failed` for blockers. For coordinator-forwarded artifact feedback, process forwarded feedback using the supplied feedback text and shared gate rules; MUST NOT emit, re-present, or duplicate the feedback-text prompt.

Before completion verify non-empty `proposal.md`, at least one non-empty `specs/**/*.md`, proposal/spec consistency, valid requirement scenarios, and the existing spec-only scope. Return only lifecycle metadata. `changed_files` is ordered and duplicate-free. Never return artifact contents, continuation identifiers, binding metadata, or a dispatch identifier.

### External findings consumption

For proposal/spec review, consume only an externally supplied `sai-explore` findings block; this worker does not dispatch or own a reviewer. Process every finding under `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md`. Require the shared contract's base-form `Summary: High=<count> Medium=<count> Low=<count>` and an explicit `High=0` before treating the block as review evidence; never infer `High=0` from missing, malformed, or other summary text. Findings may edit only `proposal.md` and `specs/**`. Report every discarded item with a specific reason. Accepted edits trigger pre-completion verification and decision-summary recomputation from current artifacts without reopening or re-emitting the already completed `proposal`, `specs`, or `validation` progress ids.

Never create a reviewer, a worker-owned findings loop, or any automatic review/retry machinery, and never process a user-requested reviewer pass. With no external findings block, proceed to the ordinary pre-gate terminal. Interactive or omitted mode leaves the coordinator-owned gate at iteration `0`, while supervised mode auto-proceeds through the deferred gate; the worker does not receive, present, branch on, or otherwise handle `mode`. Preserve the existing terminal payload rules.

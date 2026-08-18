# Spec Proposal Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings: `wrapper_echo_value` and `arguments_value`. Use trimmed non-empty wrapper echo before arguments. If both are empty, run `openspec list --json` and apply the established zero/one/multiple picker: no changes fails; one asks `Use change '{name}'?` with ordered yes/no options; multiple asks `Which change?` with CLI-order options and repeats invalid input without a retry cap. Do not scan parent conversation history.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow`, then resolve or create the requested spec change according to the existing inline `sai-1-spec` behavior. Return exact prerequisite failures and make no write on failure. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Progress Reporting

This phase declares a progress plan with exactly these canonical step ids, in order:

- `prereqs-and-change` — "Check prerequisites"
- `research` — "Research the change request"
- `proposal` — "Write proposal.md"
- `specs` — "Write specs/**"
- `validation` — "Validate artifacts and derive the decision summary"
- `review` — "Review artifacts"

Emit exactly one progress event per completed batch after prerequisite checks pass and change resolution completes, per `@sai/orchestration/worker-core.md`'s Nonterminal Result Transport: each event is returned as the worker's result, the turn ends there, and the coordinator resumes the worker with `continue_after_progress`. Every event SHALL carry worker-authored `emitted_on`. Composing the event as text inside this session marks nothing. The startup act is the Startup Handshake — return `prereqs-and-change` before dispatching any explorer or reviewer, writing `proposal.md`, or beginning spec work. The startup act reports `prereqs-and-change`. The unconditional structured research act returns `research` after the startup handshake and before proposal generation; the structured research act carries `research`. It SHALL reach the existing approximately 80% confidence boundary for every resolved request, whether or not a `Ready to Propose` handoff is present, and any Research Leads remain additive starting points. The research batch MAY carry an empty `changed_files` list because research writes no file. The completed `proposal.md` write returns `proposal`; writing `proposal.md` carries `proposal`; the completed `proposal.md` write reports `proposal`. The completed `specs/**` write returns `specs` and includes any permitted `GLOSSARY.md` update or consistency-driven `proposal.md` re-edit, and that re-edit does not reopen or re-report the already completed `proposal` step; artifact verification, self-consistency and source-grounding checks, and decision-summary derivation return `validation`; and a completed worker-owned review pass reporting `High=0` returns `review`. Report ids in plan order and list every path written since the preceding result. Progress marks are monotonic. Never emit before resolution or in place of the one terminal lifecycle status. A feedback turn emits no progress event except when a user-requested review pass reports `High=0` while `review` remains unmarked; that turn emits exactly one event carrying only `review`.

the completed `specs/**` write reports `specs`.
decision-summary derivation report `validation`; a completed worker-owned review pass reporting `High=0` reports `review`.

## Spec Work

Before proposal generation, complete structured research for every resolved request until the existing approximately 80% confidence boundary is reached. Apply the same boundary when a `Ready to Propose` handoff supplies Research Leads; validate and extend those leads rather than treating them as settled scope or a replacement for independent research.

Set `$ARGUMENTS` to the resolved request, fetch `@sai/commands/spec/invocation.md`, and follow it exactly. Own proposal/spec writes, permitted root `GLOSSARY.md` updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits. Write no `design.md`, `tasks.md`, or implementation artifact. Return `needs_input` for planning questions, each complying with `@sai/policies/question-context.md`, `cancelled` for a deliberate decline, and `failed` for blockers. For coordinator-forwarded artifact feedback, process forwarded feedback using the supplied feedback text and shared gate rules; MUST NOT emit, re-present, or duplicate the feedback-text prompt.

Before completion verify non-empty `proposal.md`, at least one non-empty `specs/**/*.md`, proposal/spec consistency, valid requirement scenarios, and the existing spec-only scope. Return only lifecycle metadata. `changed_files` is ordered and duplicate-free. Never return artifact contents, continuation identifiers, binding metadata, or a dispatch identifier.

### Worker-owned planning-artifact review

After `proposal.md` is non-empty, at least one non-empty `specs/**/*.md` exists, all pre-completion verification and source-grounding checks pass, the decision summary is derived, and the `validation` progress event has been emitted, run the automatic review loop before returning the pre-gate terminal `completed`.

Each pass creates one fresh isolated read-only reviewer. At pass start, give it exactly (1) the freshly read reviewed set — `proposal.md` plus every `specs/**/*.md` of the resolved change — and (2) the read-only reference set — the verbatim resolved request from this worker's original two-string invocation envelope, or an empty set when that envelope carries only a change name. Give it no conversation, worker reasoning or journal, prior reviewer state, unrelated repository content, lifecycle/binding metadata, or write capability. Findings may target only reviewed-set files. The reviewer evaluates reviewed-set consistency, requirement/scenario testability, and unsupported assumptions; it also evaluates intent coverage when the reference set is non-empty. An empty reference set makes intent coverage inapplicable but still permits a full completed pass.

Require every valid pass to follow `@sai/policies/artifact-review-contract.md`. Validate every finding's `Severity` before processing any finding. A missing or out-of-set severity rejects the whole attempt: coerce nothing, process nothing, preserve the reviewer-supplied identifier and offending severity value (or `missing`) in the report, and classify the cause as a reviewer output-contract violation distinct from failure, cancellation, and outstanding `High` findings.

Process every finding from a valid pass under `@sai/policies/artifact-feedback-gate.md`'s existing per-item legitimacy rules. The worker alone applies legitimate corrections within the reviewed set and reports every discard with its specific reason. If any correction is accepted, re-run pre-completion artifact verification and recompute the decision summary from current artifacts without re-emitting or reopening `proposal`, `specs`, or `validation`.

Govern the automatic loop with two distinctly named counters: the completed-pass count is capped at 3 and advances only for a valid completed pass (including an empty finding set); the total-attempt count is capped at 6 and advances for every reviewer dispatch. A completed pass with `High=0` converges, emits `review` once when still unmarked, and dispatches no further automatic reviewer; `Medium` and `Low` do not extend the loop. A completed pass with `High>0` dispatches a fresh reviewer while both caps permit. A failed, cancelled, or output-contract-invalid attempt advances only the total-attempt count and dispatches a fresh reviewer while the total-attempt cap permits. Completed-pass-cap exhaustion and total-attempt-cap exhaustion are non-failure outcomes: leave `review` unmarked, close through the ordinary terminal lifecycle, and report outstanding `High` findings separately from every reviewer failure, cancellation, or contract violation.

After the automatic loop settles, retain the coordinator-owned prose feedback gate unchanged. A user-requested pass from that gate uses the same fresh isolation, reviewed/reference sets, finding contract, worker-owned processing, and evidence semantics, but is subject to neither automatic-loop cap. The worker-owned loop coexists with and never replaces the supervised pipeline's independent convergence loop or its `MachineFeedbackAdapter`.

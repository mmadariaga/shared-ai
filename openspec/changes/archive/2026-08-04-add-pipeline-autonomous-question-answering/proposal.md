**Complexity**: high

## Why

Under `start-pipeline` supervision, explore today escalates every spec-worker `needs_input` question to the user even when it could answer with high confidence from the crystallized block — the last routine proxying step the user still performs by hand. Automating the confident answers removes that transport work, but answering silently would trade transport for lost visibility, so auto-answers must remain auditable and genuinely ambiguous questions must still reach the user.

## What Changes

- Let the supervising explore coordinator answer a spec worker's `needs_input` question itself and forward the answer to the same worker, but only when its confidence in the answer is clearly above a qualitative threshold.
- Keep the threshold qualitative: explore makes a model judgment and does not compute, require, or emit a numeric confidence value.
- Resolve all ambiguity toward escalation — borderline, unclear, or unassessed confidence never auto-answers; escalation is the default and auto-answering is the narrow exception.
- Give "unclear" an objective floor: an auto-answer is permitted only when the answer is actually located in the permitted grounding sources — bounded to the worker's question payload, the crystallized block, and the phase's own `proposal.md` and `specs/**`, and explicitly excluding the surrounding explore conversation and any other project or repository content. A question whose answer is not found there — because it depends on a downstream plan, precedent, or diff explore does not hold, or only on the explore conversation — escalates regardless of how confident explore feels, so felt confidence alone can never bypass escalation and the retired "inferring an answer from explore context" is not re-permitted.
- **BREAKING**: Replace the supervision requirement that mandated escalating *every* worker question with the thresholded auto-answer-or-escalate behavior; below-threshold questions still surface through the harness-native option picker with the worker's exact question and options unmodified, forwarded to the same worker.
- Present an audit log at every ending of the supervised spec phase — including a failed or cancelled worker and a reviewer failure, not only convergence — listing every auto-answered question, the answer given, and the reasoning behind it, so decisions made before a failure are surfaced rather than buried.
- Include the escalation denominator in the audit log — how many questions were escalated alongside how many were auto-answered — so the auto-answer ratio survives as a calibration signal for a later revisit.
- Keep the audit log in conversation only — it is never written to any file, artifact, or configuration, matching the in-conversation-only discipline the explore tracked sets already follow.
- Leave independently invoked `/sai-1-spec` and the standalone spec coordinator's escalate-every-question behavior unchanged; autonomy applies only inside `start-pipeline` supervision, where explore is proxying on the user's behalf.

## Capabilities

### New Capabilities
- `pipeline-question-autonomy`: Confidence-thresholded decision to auto-answer a supervised worker question versus escalate it, with ambiguity resolving toward escalation and confidence treated as a qualitative judgment.
- `pipeline-question-escalation`: Below-threshold questions surface to the user through the harness-native option picker with the worker's exact question and options unmodified, and the user's answer is forwarded to the same worker.
- `pipeline-autonomy-audit-log`: Every auto-answered question, its answer, and the grounding citation behind it are reported in conversation at every ending of the supervised spec phase — including failure and cancellation — alongside the count of escalated questions as a calibration denominator, and written to no file.

### Modified Capabilities
- `explore-pipeline-supervision`: Removes the "Every worker question is escalated to the user" requirement, whose mandate is superseded by the thresholded autonomy and escalation capabilities.

## Impact

- Shared explore supervision behavior and the routed spec-worker question-handling path under `sai/instructions/` and `sai/orchestration/`. The auto-answer path forwards the answer over the same continuation the escalation path already uses, so it reuses existing transport and needs no new dispatch surface.
- Structural coverage in `test/` for the auto-answer-versus-escalate decision, the grounding-triggered escalation, and the audit log.
- GitHub Copilot explore behavior is unaffected: `start-pipeline` remains supervision-unavailable there, so autonomy never engages.
- No new external dependency; no change to independently invoked `/sai-1-spec`, `/sai-2-design`, or the standalone spec coordinator's escalate-every-question contract.
- **Not changed**: explore wrapper or binding permissions under `commands/**` and `skills/**`, worker dispatch capabilities, and installer projections in `sai/install-manifest.json`. Auto-answering adds no tool or dispatch surface — it forwards over the continuation escalation already uses and skips the picker — so no wrapper, binding, or manifest change is required.

## Proposal Research Documentation

**Local files**: `openspec/specs/explore-pipeline-supervision/spec.md:1-60`; `openspec/changes/archive/2026-08-03-add-sai-explore-pipeline-supervision/proposal.md`; `openspec/changes/archive/2026-08-03-add-sai-explore-pipeline-supervision/specs/explore-pipeline-supervision/spec.md`; `openspec/changes/archive/2026-08-03-add-pipeline-review-convergence-loop/specs/explore-pipeline-supervision/spec.md:1-40`; `sai/commands/spec/coordinator.md:1-27`; `sai/orchestration/coordinator-contract.md:1-46`; `sai/orchestration/worker-lifecycle.md:1-61`; `sai/orchestration/workers/sai-1-spec-proposal-worker.md:1-18`; `GLOSSARY.md:5-133`.

**External URLs**: None.

## Additional Notes

- This change is the deferred follow-up to `add-sai-explore-pipeline-supervision`, whose proposal explicitly noted "autonomous answers are deferred". It builds directly on that archived supervision lifecycle.
- Confidence is a model judgment, so a confidently wrong auto-answer is possible. The audit log is the mitigation, not a prevention: it reframes the user from answering every question to auditing the answers that were given.
- The escalation path — not the auto-answer path — is what keeps genuinely ambiguous decisions with the user. A single thresholded behavior is intentionally shipped instead of a configurable autonomy dial; the dial can be revisited once the thresholded behavior has been used.
- Auto-answering is scoped to worker `needs_input` questions during supervised spec execution. It does not alter the independent-review convergence loop, the artifact feedback gate, or any user-facing gate.
- For a closed-choice worker question, an auto-answer selects one of the worker's own offered option values; explore does not invent values the worker did not offer.

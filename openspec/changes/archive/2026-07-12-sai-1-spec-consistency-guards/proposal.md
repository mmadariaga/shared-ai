## Why

Two shippable defects in a recent change traced back to sai-1-spec's own Completion self-check, not to missing input: a proposal asserted an aspiration that contradicted its own spec's hardcoded literal, and a MODIFIED requirement pinned a drifted string copied from the baseline spec rather than the actual source. A shorter prompt fixes neither — an explicit self-consistency gate plus a source-grounding rule does.

## What Changes

- Add a **proposal↔spec self-consistency** requirement to the `spec-quality` capability: at the Completion phase, the agent reconciles the proposal narrative against the specs so no statement in `proposal.md` contradicts a requirement or scenario in `specs/**`, reusing the artifact re-read that already produces the decision summary (no extra I/O). The spec is normative — reconciliation adjusts the proposal narrative to the spec (never the reverse) and notes the correction in the decision summary; when it is genuinely ambiguous which side reflects intent, the agent raises the same visible warning rather than silently correcting. Absence of spec coverage (deferred / out-of-scope notes) is not a contradiction.
- Add a **source-grounding of spec-pinned literals** requirement to `spec-quality`: any literal string a spec pins (most commonly a message string, config key, path, or flag fixed by a MODIFIED requirement, but also an ADDED requirement that quotes existing source) SHALL be verified against the current source via a targeted read/grep — not only against the prior spec baseline — bounded by the existing single-file cost-discipline exception and confined to the literals the phase is already grounding. When the spec and source contradict, the agent SHALL NOT silently reconcile or auto-prefer either side; it raises a visible warning naming the spec assertion (file + requirement/scenario), the divergent source value (`file:line`), and a one-line disagreement statement, leaving the user to decide which side is stale.
- Both rules land in the quality layer (`sai/instructions/spec.propose.md`); the `openspec-propose` skill, its output template, and its workflow are untouched.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities
- `spec-quality`: add a requirement for proposal↔spec self-consistency at Completion, and a requirement for source-grounding of spec-pinned literals.

## Impact

- **Instruction layer**: `sai/instructions/spec.propose.md` gains two Completion-phase quality rules. Shared across Claude / opencode / Copilot, so the rules stay harness-agnostic.
- **Wrapper**: `sai/commands/sai-1-spec.md` is touched only if a one-line Completion hook proves unavoidable; it otherwise stays thin.
- **Untouched**: the `openspec-propose` skill and its output template/workflow; the existing decision-summary behavior and its 15-line cap are preserved.
- **Runtime cost**: a marginally heavier Completion phase (a reconciliation pass over already-re-read artifacts) plus a targeted read when spec-pinned literals exist.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/spec.propose.md` — the quality layer that hosts the new rules; confirmed Cost Discipline exception (single known file / targeted symbol search) and Completion/Scope sections.
- `sai/commands/sai-1-spec.md` — the wrapper; confirmed the Completion phase already re-reads `proposal.md` + `specs/**` to derive the decision summary and cites `spec-quality` as its contract.
- `openspec/specs/spec-quality/spec.md` — the contract capability being modified; confirmed baseline requirements (decision summary, one line per decision, overflow signal).

**External URLs**:
- <!-- None. -->

## Additional Notes

- The self-consistency check is a Completion-phase gate, reusing the same artifact re-read that already produces the decision summary — it adds reasoning, not I/O.
- Literal grounding is deliberately bounded by cost discipline: a targeted read/grep for the specific literal, never broad exploration, and confined to the literals the phase already pins — not a full spec-vs-source audit of unrelated specs. It applies whenever a spec pins a literal string, with MODIFIED requirements the most common case and source-quoting ADDED requirements the retained edge case.
- A spec-vs-source contradiction is treated as signal, not error: the agent surfaces an additive, never-swallowed warning naming both sides and their locations and lets the user resolve which is stale — it does not auto-reconcile or auto-prefer either side. The same warning is placed immediately adjacent to the feedback gate so it cannot be scrolled past, and it is reused for the ambiguous proposal↔spec case in Rule #1.
- The reframing is from "summarize what I wrote" to "verify what I wrote is internally consistent and source-grounded, then summarize" — the summary output itself is unchanged.

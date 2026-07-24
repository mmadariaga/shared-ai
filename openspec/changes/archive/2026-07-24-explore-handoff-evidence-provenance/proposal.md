## Why

`sai-explore` grounds its hypothesis in specific files — partly from reading the codebase, partly from the conversation with the user — but that grounding is discarded at the context boundary, so `sai-1-spec` cannot re-derive the conversation-driven part. Recording the provenance makes the evidence→proposal→spec lineage explicit and auditable, and gives `sai-1` a verifiable starting premise.

## What Changes

- Permit (and prompt for) optional `file:line` evidence-provenance citations inside the **Why** and **Decisions & Rationale** fields of the single-change `Ready to Propose` block emitted by `sai-explore` (`sai/instructions/explore.md` item 5). Provenance is a citation for intent (WHY), never an implementation target, and no new field is added.
- Keep the crystallization language gate (item 8) invariants intact: provenance path literals are reproduced verbatim (not localized), consistent with the block's existing English scaffolding.
- Add a consumption instruction to `sai-1` (`sai/instructions/spec.propose.md`, Research Guide) directing it to read handoff-cited sources as a **premise to confirm and extend** — keeping its independent research obligation intact — and to fall back to normal research when a cited path no longer resolves.
- Reconcile the existing `explore-crystallization-block` "sole edit target" requirement, which currently asserts no shared instruction outside `explore.md` is modified: the companion consumption behavior now edits `sai/instructions/spec.propose.md` under the new capability.

## Capabilities

### New Capabilities
- `spec-research-consumption`: instructs `sai-1` to treat handoff-cited `file:line` sources as a premise to confirm and extend, preserving independent research and falling back to normal research on a stale path.

### Modified Capabilities
- `explore-crystallization-block`: the **Why** and **Decisions & Rationale** fields of the single-change block may carry optional `file:line` provenance citations for intent; the "sole edit target" requirement is scoped to acknowledge the companion `spec.propose.md` edit.

## Impact

- `sai/instructions/explore.md` — item 5 block field guidance (Why, Decisions & Rationale) and item 8 language-gate note on verbatim provenance literals.
- `sai/instructions/spec.propose.md` — Research Guide gains the handoff-provenance consumption instruction.
- No `sai-1-spec` wrapper (`commands/claude`, `commands/opencode`, `commands/copilot`) or command file is modified; no harness config is touched. Downstream design/implement phases are unaffected.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md`, `sai/instructions/spec.propose.md`, `sai/commands/sai-1-spec.md`, `openspec/specs/explore-crystallization-block/spec.md`

**External URLs**: None

## Additional Notes

- The primary dividend is **traceability**, banked by recording the paths and unconditional *with respect to how `sai-1` consumes them* — the lineage is preserved whether or not any research effort is reclaimed. Whether reclaimed effort is banked as speed or reinvested as quality is a tunable consumption knob, deliberately **not** fixed by this change. ("Unconditional" here means independent of the consumption knob, not "present on every block type" — see the sliced-block scope note below.)
- **Scope is the single-change block (item 5) only; sliced/slice-0 blocks (item 6) are a conscious deferral.** The per-slice blocks keep their fixed 5-field format unchanged: a per-slice block describes one slice's user-facing outcome, whereas provenance grounds the *whole feature's* Why/Decisions, so attaching it per slice would either repeat the same citations across slices or fragment them incorrectly — the same rationale that already keeps the four decision-facet sections out of the per-slice format. Extending provenance to sliced changes (where lineage arguably matters most) is a legitimate follow-up, not part of this change.
- The "premise to confirm and extend" framing is mandatory, not optional: it keeps the two research passes (explore's validate-hypothesis pass and sai-1's write-testable-specs pass) additive rather than correlated, preserving insight-divergence while suppressing shared blind spots.
- Non-goals: this change does not decide the cost-vs-quality consumption policy, and does not add a target-file / "where to modify" field (that is HOW, owned by `sai-2-design` / `sai-3-implement`).

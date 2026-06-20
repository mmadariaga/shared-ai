## Why

Step 5 of `sai/instructions/implement.md` regenerates `implementation.md` from `<plan_template>` from scratch, silently discarding the in-place compaction Step 1 wrote back to the file — so a `/sai-3-implement` re-run non-deterministically either matches the already-applied code or diverges from it, and the `sai-3 → sai-4 → sai-5 → sai-3` audit loop was never codified.

## What Changes

- Make the re-run contract between Step 1 (compact) and Step 5 (generate) of `sai/instructions/implement.md` **explicit**: on re-run, Step 5 preserves the prior `implementation.md` instead of regenerating it from `<plan_template>`.
- On re-run, Step 5 SHALL preserve **byte-for-byte** every step Step 1 collapsed to `*(already applied)*`, and append one new step per existing audit artifact (`review.md`, `security.md`, `performance.md`, `accessibility.md`), numbered after the last existing step.
- Add a **state-classification gate**: each prior step is classified COMPLETO (all `[x]`) / FALLO MENOR (code `[x]`, verification `[ ]`) / INCOMPLETO (any code-writing `[ ]`). Encountering an INCOMPLETO step ⇒ **STOP**; FALLO MENOR ⇒ warning + best-effort continuation.
- Review findings that name an already-compacted step are addressed as **new steps at the end** referencing the original step number — never by re-opening the compacted step.
- First-run behavior (no prior `implementation.md`) is **unchanged**: the full plan is still generated from `<plan_template>`.

## Capabilities

### New Capabilities
- `implement-rerun-preservation`: on re-run, Step 5 of `sai/instructions/implement.md` detects a prior `implementation.md`, preserves `*(already applied)*` headings byte-for-byte, appends one audit-derived step per existing audit artifact after the last existing step, and never re-opens a compacted step.
- `implement-rerun-state-classification`: Step 5 classifies each prior step as COMPLETO / FALLO MENOR / INCOMPLETO from its checkboxes and acts on the classification (INCOMPLETO ⇒ STOP; FALLO MENOR ⇒ warning + best-effort).

### Modified Capabilities
<!-- None. The Step 1 ↔ Step 5 re-run contract was previously implicit (unspecified at Step 5); the existing `implement-rerun-guard` and `audit-artifact-ingestion` capabilities describe Step 1's collapse and the audit-append intent, but neither constrains how Step 5 produces its output on a re-run. This change codifies that gap rather than altering an existing requirement.

TERMINOLOGY OVERLAP (deliberately not modified here): `implement-rerun-guard` describes the collapsed result as "the regenerated output" / "the regenerated implementation.md". That phrasing is descriptive, not a normative requirement that Step 5 regenerate from `<plan_template>`; its SHALL clauses constrain only WHAT the output contains (collapsed steps as `*(already applied)*`, partial steps in full), all of which the new preservation behavior honors. The new `implement-rerun-preservation` capability therefore supersedes that wording in intent without contradicting any normative requirement, so `implement-rerun-guard` is intentionally left unmodified to keep this change to a single instruction artifact. Rewording "regenerated output" → "the final implementation.md Step 5 produces" and fixing the duplicate `### Requirement:` heading in `implement-rerun-guard/spec.md` (a preexisting defect) are recommended as a separate, focused follow-up change. -->

## Impact

- **Files touched (by the eventual implementation):**
  - `sai/instructions/implement.md` — the **Step 5 section only** (the "Generate Full Implementation" workflow step). The matching `<plan_template>` and Hard Rules wording (lines ~273–287) currently frame Step 5 as full generation, so they are **expected** to need first-run-only qualification too; `/sai-2-design` will enumerate the exact edits as concrete tasks. No other step is modified.
- **No changes** to the `sai-3-implement` command wrappers (claude/opencode/copilot), `openspec/schemas/sai-workflow/schema.yaml` templates, or any other `sai-*` command/instruction.
- **No production/application code is run or modified** — this edits SAI workflow instruction prose.
- **Relationship to existing capabilities:** complements `implement-rerun-guard` (Step 1 compaction) and `audit-artifact-ingestion` (audit-step appending) by fixing the Step 5 step that was overwriting their result.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/implement.md` — Step 1 compaction (lines 37–51), Step 2 audit-artifact exception (lines 53–63), Step 5 generation from `<plan_template>` (lines 87–108), `<plan_template>` (141–255), Hard Rules (273–287). The Step 5 regeneration is the defect; Step 1's in-place write-back is the state being overwritten.
- `openspec/specs/implement-rerun-guard/spec.md` — existing re-run guard requirement; describes collapse occurring "in the regenerated output", confirming the regeneration assumption being corrected.
- `openspec/specs/rerun-guard-restructure/spec.md` — confirms Step 1 is the top-level re-run guard and the Step 1→5 numbering this change references.
- `openspec/specs/rerun-research-exception/spec.md` — defines the "applied-steps set non-empty" re-run signal reused by the classification gate.
- `openspec/specs/audit-artifact-ingestion/spec.md` — existing requirement that audit artifacts are appended as one step each at the end; preserved and reconciled with byte-for-byte preservation.
- `openspec/changes/add-llm-mutation-analysis-to-review/{proposal.md,specs/mutation-analysis/spec.md}` — format/convention reference for instruction-prose change proposals in this repo.

**External URLs**: None

## Additional Notes

- **`*(already applied)*` marker stays minimal** — no commit refs, no timestamps. Byte-for-byte preservation means the marker line is copied exactly as Step 1 wrote it.
- **`tasks.md` drift between runs is out of scope** — orphan headings in `implementation.md` (steps no longer present in `tasks.md`) are preserved as-is, not deleted or remapped.
- **Classification source of truth is the checkbox state**, not commit history: COMPLETO = every checkbox `[x]`; FALLO MENOR = code-writing checkboxes `[x]` but verification checkboxes `[ ]`; INCOMPLETO = at least one code-writing checkbox `[ ]`. A **code-writing checkbox** is one whose line introduces or modifies project files (instruction boxes, RED stub/test-creation boxes, GREEN implementation boxes); a **verification checkbox** only runs or inspects (Verification Checklist boxes, "Verify RED"/GATE boxes, "Verify GREEN" boxes). The RED and GREEN phases each contain both kinds, so the distinction is per-checkbox, not per-phase.
- **STOP vs best-effort rationale:** an INCOMPLETO step means code the audit loop assumes exists may not — continuing would generate steps on a false premise, so the run STOPs. A FALLO MENOR step has its code applied but unverified, which is recoverable, so the run warns and proceeds best-effort.
- **Append numbering:** new audit-derived steps are numbered strictly after the highest existing `#### Step N:` number found in the prior file, preserving the existing sequence even when orphan/out-of-order headings exist.

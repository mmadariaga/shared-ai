## Why

`openspec/specs/implement-rerun-guard/spec.md` describes the collapsed re-run result as "the regenerated output" / "the regenerated `implementation.md`". After `sai-3-rerun-preserve-compacted` codified that Step 5 *preserves* (rather than *regenerates*) a prior `implementation.md` on re-run, the word "regenerated" now actively misleads a reader of the merged specs. The same spec also carries a duplicated `### Requirement:` heading (the heading is pasted twice, once with an empty body), a parser/maintenance hazard. `sai-3-rerun-preserve-compacted` deliberately left both defects out of its tight scope and recommended this focused follow-up.

## What Changes

- Reword the descriptive phrase "regenerated output" / "regenerated `implementation.md`" throughout the `implement-rerun-guard` requirement bodies and scenarios so it names the actual producer, distinguishing **Step 1's in-place collapsed write-back** (where the `*(already applied)*` marker is emitted) from **the final `implementation.md` that Step 5 produces**. No normative SHALL/MUST content changes — same WHAT, clearer prose.
- Collapse the duplicated `### Requirement: \`/sai-3-implement\` MUST skip fully-applied steps when \`implementation.md\` already exists` heading (it appears twice; the first occurrence has an empty body) into a single requirement block, preserving all its scenarios.
- Apply the identical "regenerated output" rewording to `implement-rerun-guard-enhancement`, which carries the same misleading phrasing (see Modified Capabilities).
- The `*(already applied)*` marker format is preserved exactly — no commit refs, no timestamps — consistent with `sai-3-rerun-preserve-compacted`.

## Capabilities

### New Capabilities
<!-- None. This is a spec-record correction to existing capabilities. -->

### Modified Capabilities
- `implement-rerun-guard`: reword "regenerated output" → producer-specific phrasing (Step 1 write-back vs. final `implementation.md` Step 5 produces) in both requirements, and collapse the duplicated `### Requirement:` heading into one block. Normative behavior unchanged.
- `implement-rerun-guard-enhancement`: reword the same "regenerated output" phrasing in its single Step 1b requirement (item 3 and the "fully-applied step collapsed" scenario). Included because it carries the identical defect; normative behavior unchanged. (See Additional Notes for the evaluation rationale.)

## Impact

- **Spec record only.** Two delta files: `specs/implement-rerun-guard/spec.md` and `specs/implement-rerun-guard-enhancement/spec.md`, both `## MODIFIED Requirements`.
- **No production surface touched** — `sai/instructions/implement.md`, the `sai-*` command wrappers, `openspec/schemas/sai-workflow/schema.yaml`, and all application code are unchanged. The grounding read of `implement.md` (Step 1 / Step 5 mechanics) was read-only.
- **No normative change.** Every WHEN/THEN assertion keeps its meaning; only the descriptive label "regenerated" and the duplicate heading are touched.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/implement-rerun-guard/spec.md` — the target spec; "regenerated output"/"regenerated implementation.md" at lines 10, 17, 31, 38, 48; duplicated `### Requirement:` heading at lines 27 and 29.
- `openspec/specs/implement-rerun-guard-enhancement/spec.md` — carries the identical "regenerated output" phrasing at lines 10 and 17; no duplicate heading.
- `sai/instructions/implement.md` — Step 1 (lines 37–51) writes the collapsed file back in place; Step 5 (lines 87–92) preserves on re-run / generates from `<plan_template>` on first run. Grounds the producer naming. Read-only; not modified.
- `openspec/changes/archive/2026-06-20-sai-3-rerun-preserve-compacted/{proposal.md,specs/implement-rerun-preservation/spec.md}` — the change that codified preservation and flagged this cleanup as a follow-up; source of the recommended replacement phrasing and the byte-for-byte marker constraint.
- `openspec/schemas/sai-workflow/templates/specs.md` — delta format (`## ADDED / ## MODIFIED / ## REMOVED Requirements`).

**External URLs**: None

## Additional Notes

- **Enhancement-spec evaluation:** the task asked whether `implement-rerun-guard-enhancement/spec.md` carries the same "regenerated output" phrasing. It does (lines 11 and 17, identical to `implement-rerun-guard`'s Requirement 1), so it is included in scope. Leaving it would let an identical misleading label survive in the merged specs, defeating this change's purpose.
- **Producer de-conflation:** in `implement.md`, the `*(already applied)*` marker is emitted by **Step 1's subagent, which writes the simplified file back to the same path** (lines 45–46). **Step 5** then produces the final `implementation.md` (preserves it on re-run, generates from `<plan_template>` on first run). The old "regenerated output" wording wrongly implied Step 5 regenerates the collapse. The reworded prose attributes collapse-emission to Step 1's in-place write-back and final-file-content assertions to "the final `implementation.md` that Step 5 produces."
- **Duplicate-heading handling (archive caveat for the reviewer):** the duplicate is the *same requirement name* appearing twice — the first occurrence (line 27) has an empty body, the second (line 29) the full body. OpenSpec deltas are keyed by requirement name, so the duplicate cannot be expressed as a `## REMOVED Requirements` entry without contradicting the `## MODIFIED` entry of the same name. It is therefore collapsed by providing a **single** corrected block under `## MODIFIED Requirements` representing the requirement's desired end state (one heading, all scenarios). When applying/archiving, ensure the result contains exactly one requirement of that name — replace both source occurrences with the single modified block.
- **No marker change:** `*(already applied)*` is preserved verbatim everywhere; no commit references or timestamps are introduced.

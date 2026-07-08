## Why

Phase 3 (Conflict Detection) of `sai-backfill` is the last `sai-*` closed-choice prompt still using a typed `(proceed/abort)` reply, while Phase 1 already routes its closed choice through the harness-native option-picker. This inconsistency is a small usability wart and a drift from the centralized closed-choice rule.

## What Changes

- Update the Phase 3 conflict-decision prompt in `sai/instructions/backfill.md` to present its proceed/abort decision through the closed-choice rule in `remember.md` (harness-native option-picker where one exists; plain-text fallback otherwise), mirroring Phase 1.
- Keep the plain-text form (for harnesses without a native picker, e.g. Copilot) with `proceed` and `abort` as full-word options.
- Define Phase 3's invalid-input handling to match Phase 1: a reply mapping to neither option is invalid and re-asked (previously undefined — now reachable via AskUserQuestion's auto-appended free-text "Other").
- Leave abort/proceed semantics and the Phase 3 conflict-listing output unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `backfill-conflict-detection`: the proceed/abort decision after the conflict report gains a presentation contract — it MUST be surfaced via the centralized closed-choice rule (native option-picker when available, plain-text fallback otherwise) instead of a typed `(proceed/abort)` reply, and its invalid-input handling is defined to re-ask (parity with Phase 1).

## Impact

- **Affected instruction**: `sai/instructions/backfill.md` (Phase 3 prompt only) — single-file edit.
- **Unchanged**: harness wrapper commands (they only `Fetch` the instruction), the `remember.md` closed-choice rule (reused, not modified), and Phase 3's conflict-listing output.
- No production/application code affected; this is a prompt-instruction change.

## Proposal Research Documentation

**Local files**: `sai/instructions/backfill.md`, `sai/instructions/remember.md`, `openspec/specs/backfill-conflict-detection/spec.md`, `openspec/specs/closed-choice-prompts/spec.md`

**External URLs**: <!-- none -->

## Additional Notes

- Phase 1 (Diff Source Selection, `backfill.md` lines ~14–24) is the reference pattern: it references the `remember.md` closed-choice rule and provides the exact plain-text block for the no-picker fallback.
- The `closed-choice-prompts` capability already mandates full-word labels and centralization of the per-harness mapping in `remember.md`; this change brings Phase 3 into conformance with it.
- ADR 0007 already established interactive selection for backfill decisions, so no new design decision is introduced.

## Why

The (b) "Continue now in this chat" branch of `/sai-2-design` contains a redundant "ask the user to review the design artifacts and STOP until they confirm" sub-step. The artifact-feedback-gate immediately upstream already serves as the review confirmation, so this second free-text STOP duplicates work the user has already done and delays entry into `sai-3` without adding new information.

## What Changes

- Remove the "Ask the user to review `design.md`, `tasks.md`, and `interfaces.md` before continuing, and STOP until they confirm. Once they confirm," sub-step from the (b) branch at `sai/commands/sai-2-design.md:62`.
- Preserve verbatim the re-read of `design.md`, `tasks.md`, and `interfaces.md` from disk on the (b) path (artifacts may have changed during a gate iteration).
- Preserve the direct `Fetch @sai/instructions/implement-invocation.md` handoff and the "Do NOT proceed past its Completion" boundary on the (b) path.
- No change to the (a) "Stop for a new chat" branch, the (a)/(b) implementation-continuation question text, the artifact-feedback-gate, or the fast-track opt-out set.

## Capabilities

### New Capabilities
- `sai-2-continue-branch-flow`: the (b) "Continue now in this chat" branch of sai-2-design enters implementation directly after re-reading the design artifacts from disk, with no intervening review-and-confirm STOP.

### Modified Capabilities
<!-- none -->

## Impact

- `sai/commands/sai-2-design.md` — single-file edit confined to the (b) branch (line 62). No other file in `sai/`.
- No wrapper changes (`commands/claude/`, `commands/opencode/`, `commands/copilot/`), no main spec under `openspec/specs/`, no `AGENTS.md` or `README.md` entries.
- The `sai-2-design` fast-track opt-out set (`sai-fast-track-flag`) is unchanged — still "specs approval gate only".

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-2-design.md` (line 62 — the (a)/(b) completion branch being edited; and lines 40–55 — the artifact-feedback-gate that serves as the review confirmation)
- `sai/instructions/implement-invocation.md` (the shared handoff the (b) path fetches directly)
- `openspec/specs/implementation-continuation/spec.md` (governs the (a)/(b) gate ordering and labeling — unaffected)
- `openspec/specs/artifact-feedback-gate/spec.md` (the upstream gate that already covers review confirmation)
- `openspec/specs/sai-fast-track-flag/spec.md` (sai-2-design opt-out set = "specs approval gate only" — unchanged)

**External URLs**: <!-- none -->

## Additional Notes

- The upstream flow is: decision summary → artifact-feedback-gate (`proceed-label = Continue`) → the (a)/(b) question. By the time the user reaches (b) they have either iterated via "Give feedback" or picked "Continue" to signal no further iteration; the disk re-read on (b) still covers the "artifacts may have changed" safety case.
- The `implementation-continuation` capability already requires (a) `Stop for a new chat` to be the first, Recommended option and (b) `Continue now in this chat` to stay second and fully available. This change does not touch that ordering — it only removes a sub-step that runs *after* (b) is selected.

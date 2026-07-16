## Why

The post-crystallization review loop in `sai/instructions/explore.md` (item 9) leaves its closing message unconstrained, so real outputs have proposed `/sai-1-spec` again at loop end — proposing the very step whose artifacts the loop just reviewed. The loop is a sanity-check gate, not a pipeline router, and should close without proposing a new command prompt.

## What Changes

- Add a **Closing the loop** subsection to item 9 of `sai/instructions/explore.md` prescribing silent termination when at least one review happened during the loop: no new command prompt is proposed.
- Explicitly prohibit proposing `/sai-1-spec` for any change in the tracked crystallized set, on the grounds that sai-1's artifacts are exactly what the loop reviews.
- Keep the existing **Explicit re-crystallization path** subsection verbatim — it is already user-initiated (no auto-emit) and does not violate the no-prompt rule.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `explore-post-crystallization-review-loop`: adds a requirement that the loop closes silently — proposing no new command prompt — once at least one review has happened, and never proposes `/sai-1-spec` for a change in the tracked crystallized set.

## Impact

- Single-file change: `sai/instructions/explore.md` only. Items 5, 6, 7, 8 and the existing subsections of item 9 (`Tracked crystallized set`, `On Yes`, `Language gate reuse`, `Read-only constraint`, `Explicit re-crystallization path`) are unchanged.
- Harness-agnostic: the rule applies identically across Claude Code, opencode, and GitHub Copilot via the shared instruction. No wrapper edits in `commands/claude/`, `commands/opencode/`, or `commands/copilot/`.
- No new tests: sai-explore is a prompt instruction; verification is by inspection against the new subsection and a manual check that the closing message proposes no new prompt.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md` (item 9 and its subsections); `openspec/specs/explore-post-crystallization-review-loop/spec.md` (existing capability contract).

**External URLs**: <!-- none -->

## Additional Notes

- The user's rule is unconditional: if any review has happened, do not propose any new prompt. A templated next-step prompt (e.g. `/sai-2-design`, `/sai-3-implement`) is still a prompt and is therefore also prohibited.
- The rule fires on whether *any* review happened, not on which artifact sets were reviewed — no per-change tracking of reviewed sets is introduced.
- A minimal status indicator (e.g. "Loop closed") is permitted but not required; pure silence is also acceptable. What is prohibited is proposing a new command prompt.
- The pipeline order (sai-1 → sai-2 → sai-3) is documented in `AGENTS.md`; the loop is not the place to re-teach it, so no global "next step" reminder is added at loop close.

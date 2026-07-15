## Why

Once `sai-explore` prints a `Ready to Propose` block, the session ends with "Open a new chat and run `/sai-1-spec`", giving the user no chance to inspect what downstream steps (sai-1's `proposal.md` + `specs/**`, sai-2's `design.md` + `tasks.md` + `interfaces.md`) already wrote before committing to a fresh chat. This blocks informed re-crystallization and leaves the explore session blind to the artifacts it implicitly coordinates with.

## What Changes

- Add a post-crystallization, read-only review section to `sai-explore`, printed immediately under the `Ready to Propose` block and separated by a visual divider.
- Offer a global Yes/No question with **no precondition** — always asked, regardless of whether any downstream artifact exists.
- On Yes, iterate over every non-archived change under `openspec/changes/` (resolved via `openspec list --json`); per change present a `Review sai-1` / `Review sai-2` / `Skip` picker.
- Re-show the picker for the same change after a `Review sai-1` or `Review sai-2` selection; only `Skip` advances to the next change. The loop ends when all non-archived changes are processed.
- Reuse the existing artifact-review language gate (item 3, with its Persistence rule) for each review turn; `--fast-track`'s existing language-skip continues to apply unchanged.
- Keep the section strictly read-only: never edit reviewed artifacts and never alter the already-emitted `Ready to Propose` block. Re-crystallization requires an explicit user request, which re-fires the crystallization language gate.
- `--fast-track` does NOT skip the section's two questions (global Yes/No, per-change picker); it continues to skip only the language-gate question for review content.
- The change lives entirely in `sai/instructions/explore.md`. No AGENTS.md change; no wrapper change; no other `sai-*` command affected.

## Capabilities

### New Capabilities
- `explore-post-crystallization-review-loop`: a read-only, post-`Ready to Propose` review loop in `sai-explore` that lets the user inspect downstream artifacts (sai-1, sai-2) for any non-archived change before re-crystallizing.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected instruction**: `sai/instructions/explore.md` only (adds a new numbered section after the existing items 1–8).
- **Reused behavior**: the artifact-review language gate (`explore.md` item 3), including its Persistence rule and `--fast-track` language-skip.
- **Unaffected**: `commands/{claude,opencode,copilot}/sai-explore.*` wrappers, `AGENTS.md`, and every other `sai-*` command.
- **CLI dependency**: `openspec list --json` is the single source for resolving non-archived change names.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md`, `sai/instructions/remember.md`, `openspec/specs/explore-review-language-gate/spec.md`, `openspec/specs/explore-crystallization-language-gate/spec.md`

**External URLs**: <!-- None -->

## Additional Notes

- The artifact-review language gate already lives in `explore.md` item 3 and defines English-skip, non-English gate, fast-track skip, and a Persistence rule keyed on the tracked artifact set. This change reuses it as-is; each review turn's target set (sai-1 artifacts vs sai-2 artifacts of the current change) drives its re-ask behavior.
- "Review sai-1" reads `proposal.md` + `specs/**`; "Review sai-2" reads `design.md` + `tasks.md` + `interfaces.md` for the change currently being iterated.
- The per-change loop is a no-op when `openspec list --json` returns zero non-archived changes: the global Yes still shows, then the loop immediately terminates.
- The global No is a hard stop on the entire new section.

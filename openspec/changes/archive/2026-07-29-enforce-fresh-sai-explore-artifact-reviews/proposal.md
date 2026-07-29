**Complexity**: low (1 capability, 2 requirements, 1 affected path, no breaking change, no new dependency)

## Why

Repeated post-crystallization reviews can rely on earlier review output or stale absence reports instead of inspecting the current change directory. This can make `sai-explore` miss artifacts created or modified after an earlier review, so every review transaction must establish its evidence from the files currently on disk.

## What Changes

- Strengthen the `sai-explore` post-crystallization review loop so each sai-1 and sai-2 review independently resolves the exact current change directory and checks every requested artifact path.
- Require each review, including repeated selections for the same change, to reread all currently available requested artifacts from disk before producing findings.
- Treat prior review output, cached existence or contents, and stale absence reports as invalid evidence for current artifact existence or contents; the current chat-scoped crystallized change name remains authoritative for resolving the review target.
- Preserve read-only behavior, selected review-language persistence, the existing loop controls, and the distinction between a missing change directory and missing artifacts within an existing directory.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `explore-post-crystallization-review-loop`: require fresh current-directory resolution, per-path existence checks, and rereads for both sai-1 and sai-2 artifact reviews.

## Impact

- `sai/instructions/explore.md`
- No wrappers, production code, configuration, policies, or other instruction files are changed.
- No dependencies or external systems are introduced.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/explore.md`
- `openspec/specs/explore-post-crystallization-review-loop/spec.md`
- `openspec/specs/spec-quality/spec.md`
- `sai/instructions/spec.propose.md`
- `GLOSSARY.md`

**External URLs**: None

## Additional Notes

- A repeated review is a new review transaction, not a continuation of the previous analysis; "unchanged" may be concluded only after rereading.
- Missing the entire exact change directory and missing an individual requested artifact remain distinct outcomes.
- The change is intentionally instruction-only because the wrappers already load the canonical `explore.md` instruction.

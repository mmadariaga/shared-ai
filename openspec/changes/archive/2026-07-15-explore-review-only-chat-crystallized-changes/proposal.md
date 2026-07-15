## Why

The post-crystallization review loop in `sai-explore` currently offers reviews for every non-archived change in the repository, even when the current chat has only crystallized one narrow idea. That overreaches the context the chat has actually earned and makes the review picker blur together in-conversation work with unrelated changes.

## What Changes

- Narrow `sai-explore`'s post-crystallization review loop so the global Yes path iterates only the change names crystallized in the current chat.
- Define the tracked review-target set as in-conversation-only state: it starts empty, is updated only when crystallization emits a change name, preserves first-emission order, and ignores duplicates.
- Rename the per-change sai-1 picker option from `Review sai-1` to `Review sai-1's artifacts` to make the reviewed artifact scope explicit.
- Make the sai-1 review path explicitly surface incomplete artifact sets, such as a change that has `proposal.md` but no `specs/**/*.md`, so the user sees that behavior review is blocked by missing normative specs rather than silently treating the set as complete.
- Preserve the rest of the loop's behavior: the global Yes/No question remains unconditional, review actions remain read-only, picker re-entry stays unchanged, and the existing artifact-review language gate is still reused.
- Keep the entire change inside `sai/instructions/explore.md`; do not modify wrappers or any other `sai-*` command.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `explore-post-crystallization-review-loop`: restrict post-crystallization reviews to the change names crystallized in the current `sai-explore` chat and clarify the sai-1 picker label.

## Impact

- **Affected instruction**: `sai/instructions/explore.md` only.
- **Behavioral shift**: the per-change loop no longer discovers repository-wide non-archived changes via `openspec list --json`; it iterates only the chat-scoped crystallized set built during the current `sai-explore` session.
- **Unchanged**: the global Yes/No offer remains unconditional, review actions remain read-only, picker re-entry semantics stay the same, and the existing artifact-review language gate continues to govern review-content language.
- **Unaffected files**: `commands/{claude,opencode,copilot}/sai-explore.*`, `AGENTS.md`, and every other `sai-*` command.

## Proposal Research Documentation

**Local files**: `GLOSSARY.md`, `sai/instructions/explore.md`, `openspec/specs/explore-post-crystallization-review-loop/spec.md`, `openspec/changes/archive/2026-07-15-explore-post-crystallization-review-loop/proposal.md`

**External URLs**: None


## Additional Notes

- The tracked change-name set is intentionally ephemeral and chat-scoped. It is never derived from repository state and is never written to disk.
- Crystallization output is the only source allowed to add names to the eligible review set; other explore turns do not mutate it.
- When a sai-1 review target is incomplete, the review should distinguish "artifact set incomplete" from "review found no issues" so missing specs are visible as the blocker.
- The narrowed loop is still offered after every crystallization turn, even when the tracked set is empty, so the section remains structurally consistent and the global No path stays a hard stop.
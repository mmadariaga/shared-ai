**Complexity**: low

## Why

The post-crystallization review loop currently exposes five per-change picker options, exceeding Claude Code's native four-option picker limit. Replacing the picker exit option with an active-loop-only `exit` free-text token preserves explicit loop termination without violating the native picker constraint.

## What Changes

- Replace the per-change five-option navigation picker with exactly four fixed options: `Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, and `Skip`.
- Remove `Exit review loop` from picker navigation and recognize the literal `exit` through the existing bare-token/dominant-intent rule, narrowed so the dominant-intent branch requires an English spelling variant of `exit`, only while a member of the chat-scoped, first-emission-ordered tracked crystallized set is being processed.
- When `exit` fires, resolve the active review item from `in_progress` to `pending`, leave later members of the tracked set unprocessed, and use the existing loop-closing acknowledgment and no-next-command behavior.
- Preserve `sai-explore`'s read-only scope and all unrelated review-loop behavior.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `explore-post-crystallization-review-loop`: replace the fifth per-change picker option with the active-loop-only `exit` free-text termination token.

## Impact

- `sai/commands/explore/instructions.md`: update the post-crystallization review-loop contract and its 13 currently identified five-option picker references.
- `test/change-overview-contract.test.js`: update the contract assertions for the four-option picker and active-loop `exit` token.
- No wrappers, policies, project source, or configuration files are changed.

## Proposal Research Documentation

**Local files**: `sai/commands/explore/instructions.md`; `sai/policies/remember.md`; `openspec/specs/explore-post-crystallization-review-loop/spec.md`; `GLOSSARY.md`

**External URLs**: None

## Additional Notes

- The four picker labels remain fixed English literals and remain native-picker options; only the literal `exit` is entered through the picker interaction's free-text field. The shared contract applies identically across Claude Code and opencode; it introduces no harness-specific semantic fork.
- The token is introduced behavior, so its absence from the current source is expected until implementation.
- A targeted source check confirms 13 current five-option picker references; implementation verification must update all 13 so no stale five-option wording remains.
- The spec maps all seven crystallized edge cases explicitly while using E labels only for the three matching cases: crystallized E1 (outside the active window) → spec E1; E2 (negated/non-firing intent) → `negated or incidental exit text does not fire`; E3 (trivial spelling variants fire) → spec E3; E4 (active review-item state resolution) → `bare exit closes the active loop`; E5 (immediate termination and ordinary close) → `exit preserves evidence and uses the ordinary close`; E6 (unmatched free text) → `unmatched free text re-presents the current picker`; E7 (empty tracked set) → spec E7.

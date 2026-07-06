# Change Picker

Shared instruction that resolves a missing OpenSpec change name for change-consuming `sai-*` commands (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`). Fetched identically by every consumer — do not duplicate this logic inline in any command body.

## Invocation trigger

Run this instruction only when `$ARGUMENTS` is empty at the point the consuming command's fetch reaches it. If `$ARGUMENTS` is already non-empty, this instruction is a no-op: do not query OpenSpec, do not prompt the user, and proceed using the provided value exactly as before this capability existed.

## Resolution (when `$ARGUMENTS` is empty)

1. Run `openspec list --json` and parse the `changes` array. Use only `changes[].name` — no filesystem globbing of `openspec/changes/`, no additional CLI flags or dependencies.

2. **Zero changes** — if `changes` is empty: STOP and print exactly: "No active changes found. Run `/sai-1-spec` to create one." Do not proceed to any further processing in the consuming command.

3. **Exactly one change** — present the single change's name and ask: "Use change '{name}'? (yes/no)"
   - "yes" (case-insensitive) → confirm. That change's name becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (including "no", silence, or an off-topic reply) → decline. STOP. Do not resolve a name and do not proceed further in the consuming command. No retry loop for this path.

4. **Two or more changes** — present a numbered list of change names (1-indexed, in the order returned by `openspec list --json`) and prompt: "Which change? Enter a number (1-{N})."
   - A number within `1-{N}` → valid. The change at that position becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (non-numeric, out of range, or otherwise invalid) → reject the input and re-prompt with the same numbered list. Re-prompt unboundedly — no retry cap.

## Resolved name substitution

Once a change name is resolved (via step 3 or step 4 above), it becomes `$ARGUMENTS` for the remainder of the consuming command: every subsequent step (remaining prerequisite checks, instruction fetches, completion messages) uses the resolved name exactly as if the user had typed it.

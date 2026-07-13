# Change Picker

Shared instruction that resolves a missing OpenSpec change name for change-consuming `sai-*` commands (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`). Fetched identically by every consumer — do not duplicate this logic inline in any command body.

## Invocation trigger

Run this instruction only when no change name is available from the wrapper-echo line and the consuming command's `$ARGUMENTS` is empty at the point the consuming command's fetch reaches it. If either source provides a non-empty change name, this instruction is a no-op: do not query OpenSpec, do not prompt the user, and proceed using the provided value exactly as before this capability existed. The wrapper-echo line check runs first; the `$ARGUMENTS` check is the fall-through path.

## Wrapper-Echo Resolution

When the conversation history contains a line matching exactly `**Change-name argument:** <value>` (two literal asterisks, the literal text `Change-name argument:`, a single space, and the change name; the value extends to the end of that line) with non-empty `<value>`, treat `<value>` as the resolved change name and skip the picker entirely. The scan covers the user message that invoked the command (the wrapper), so the line is reliably found even if tool results or model turns have appeared afterward. If the line is absent, or present with an empty or whitespace-only value, fall through to the existing `$ARGUMENTS` check and the 0/1/N picker logic.

## Resolution (when `$ARGUMENTS` is empty)

1. Run `openspec list --json` and parse the `changes` array. Use only `changes[].name` — no filesystem globbing of `openspec/changes/`, no additional CLI flags or dependencies.

2. **Zero changes** — if `changes` is empty: STOP and print exactly: "No active changes found. Run `/sai-1-spec` to create one." Do not proceed to any further processing in the consuming command.

Both prompts below are closed-choice: present the choices through the harness's native option-picker tool when one exists, otherwise fall back to the plain-text prompts as written (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness mapping). The selection semantics are identical either way.

3. **Exactly one change** — ask: "Use change '{name}'?" with options "yes" / "no" (plain-text fallback: "Use change '{name}'? (yes/no)").
   - "yes" (clicked or typed, case-insensitive) → confirm. That change's name becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (including "no", silence, or an off-topic reply) → decline. STOP. Do not resolve a name and do not proceed further in the consuming command. No retry loop for this path.

4. **Two or more changes** — ask: "Which change?" with one option per change name (in the order returned by `openspec list --json`; plain-text fallback: a 1-indexed numbered list with the prompt "Which change? Enter a number (1-{N}).").
   - A clicked option, or a number within `1-{N}` → valid. That change becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (non-numeric, out of range, or a free-text reply that matches no listed name) → reject the input and re-prompt with the same options. Re-prompt unboundedly — no retry cap.

## Resolved name substitution

Once a change name is resolved (via step 3 or step 4 above), it becomes `$ARGUMENTS` for the remainder of the consuming command: every subsequent step (remaining prerequisite checks, instruction fetches, completion messages) uses the resolved name exactly as if the user had typed it.

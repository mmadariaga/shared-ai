# Change Picker

Shared instruction that resolves a missing OpenSpec change name for change-consuming `sai-*` commands (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`). Fetched identically by every consumer — do not duplicate this logic inline in any command body. `sai-status` is deliberately NOT a consumer — it resolves change names via `sai/policies/status-picker.md` instead.

## Envelope-only resolution source

The boot envelope provides `arguments_value`. After trimming surrounding whitespace, a non-empty `arguments_value` is the sole authoritative supplied change-name source. No other source may supply or override a change name.

When trimmed `arguments_value` is non-empty, use it as the resolved change name and skip the picker. When trimmed `arguments_value` is empty, run the existing 0/1/N picker below.

## Invocation trigger

The boot adapter provides `arguments_value`. Trim its surrounding whitespace before resolution. A non-empty trimmed `arguments_value` is the sole authoritative supplied change-name source: use it as the resolved change name and skip this picker. Run this instruction only when the trimmed `arguments_value` is empty. Do not use any other input source to resolve or override a change name.

## Resolution (when trimmed `arguments_value` is empty)

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

Once a change name is resolved (via step 3 or step 4 above), it becomes the effective `arguments_value` for the remainder of the consuming command: every subsequent step (remaining prerequisite checks, instruction fetches, completion messages) uses the resolved name exactly as if the user had typed it.

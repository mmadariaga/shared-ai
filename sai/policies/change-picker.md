# Change Picker

Shared instruction that resolves a missing OpenSpec change name for change-consuming `sai-*` commands (`sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`). Fetched identically by every consumer — do not duplicate this logic inline in any command body. For `sai-1-spec` it applies only when the trimmed `arguments_value` is empty (a supplied name still selects an existing change to build on; the picker never invents a new change). `sai-status` is deliberately NOT a consumer — it resolves change names via `sai/policies/status-picker.md` instead.

## Envelope-only resolution source

The boot envelope provides `arguments_value`. After trimming surrounding whitespace, a non-empty `arguments_value` is the sole authoritative supplied change-name source. No other source may supply or override a change name.

The resolution itself — the supplied-name short-circuit and the 0/1/N branches over the active change list — is made by `sai/tools/change-picker.js`, not re-derived here. The tool resolves; you ask. Run the tool, read its outcome, and present the matching prompt below. Do not list the changes yourself, do not second-guess an outcome, and do not let the tool phrase a question.

### The change-picker tool

Use the copy that lives beside this policy file: a copy under a different root is a different version. Do **not** build its path by joining a root string to a suffix — composed absolute paths are known to drop a segment (see the "Path composition" rule in the fetch skill). Take the **first candidate below that exists**, copied **verbatim**, exactly as written:

On **Claude Code**, in this order:

1. `.claude/sai/tools/change-picker.js` — the project-local root, relative to the working directory.
2. `~/.claude/sai/tools/change-picker.js` — the user-global root.

On **opencode**, in this order:

1. `.opencode/sai/tools/change-picker.js` — the project-local root, relative to the working directory.
2. `~/.config/opencode/sai/tools/change-picker.js` — the default user-global config root.
3. Only when neither exists: run `opencode debug paths`, take the config directory **exactly as that command prints it** (an XDG override moves it), and use the fixed suffix `sai/tools/change-picker.js` inside it. This is the one place a path is joined at all, and only to a path the harness itself printed.

Whichever candidate wins, the invocation is byte-identical, so a single whitelist entry per root covers it:

```
node <tool-path> resolve "<arguments_value>" --json --cwd <project-root>
```

Always pass `--json`, and always pass `--cwd` with the project root the command was invoked from. Pass `arguments_value` as the single positional argument; omit it when it is empty. The tool trims it and, when it is non-empty, returns it as the resolved change name.

If no candidate exists, say so — name the candidates you tried — and stop; do not fall back to resolving the name in prose.

## Outcome handling

The tool reports the outcome in `outcome`, together with the ordered `options` array the prompt presents. Exit codes: **0** — a name was resolved or an option set is reported; **1** — refused, there is no active change to pick; **2** — usage error or CLI failure, reported on stderr. On exit 2 the resolution could not be completed: report that as-is, print no literal below, and do not continue as if a name had been resolved.

1. **`outcome: supplied`** (exit 0) — `resolved_name` carries the trimmed `arguments_value`. Skip the picker entirely; go to "Resolved name substitution" below.

2. **`reason: no-active-changes`** (exit 1) — the change list is empty: STOP and print exactly: "No active changes found. Run `/sai-1-spec` to create one." Do not proceed to any further processing in the consuming command.

Both prompts below are closed-choice: present the choices through the harness's native option-picker tool when one exists, otherwise fall back to the plain-text prompts as written (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness mapping). The selection semantics are identical either way. Present the tool's `options` in the reported order, using each option's `label`, and never add, drop, or reorder one.

3. **`outcome: confirm`** (exactly one change) — ask: "Use change '{name}'?" with options "yes" / "no", where `{name}` is the reported `candidate` (plain-text fallback: "Use change '{name}'? (yes/no)").
   - "yes" (clicked or typed, case-insensitive) → confirm. That change's name becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (including "no", silence, or an off-topic reply) → decline. STOP. Do not resolve a name and do not proceed further in the consuming command. No retry loop for this path.

4. **`outcome: select`** (two or more changes) — ask: "Which change?" with one option per reported change name (in the order the tool reports; plain-text fallback: a 1-indexed numbered list with the prompt "Which change? Enter a number (1-{N}).", where `{N}` is the reported `option_count`).
   - A clicked option, or a number within `1-{N}` → valid. That change becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (non-numeric, out of range, or a free-text reply that matches no listed name) → reject the input and re-prompt with the same options. Re-prompt unboundedly — no retry cap.

## Resolved name substitution

Once a change name is resolved (via step 1, step 3, or step 4 above), it becomes the effective `arguments_value` for the remainder of the consuming command: every subsequent step (remaining prerequisite checks, instruction fetches, completion messages) uses the resolved name exactly as if the user had typed it.

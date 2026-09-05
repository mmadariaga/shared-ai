# Status Picker

Dedicated instruction that resolves a missing OpenSpec change name for `sai-status` ONLY. It reuses the shared `change-picker.md` 0/1/N resolution machinery verbatim, adding a **"See all"** bulk-view option on the two-or-more-changes branch. No other `sai-*` command fetches this file — the 9 change-consuming commands (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`) use `change-picker.md`.

## Envelope-only resolution source

The boot envelope provides `arguments_value`. After trimming surrounding whitespace, a non-empty `arguments_value` is the sole authoritative supplied change-name source. No other source may supply or override a change name.

The resolution itself — the supplied-name short-circuit and the 0/1/N branches over the active change list — is made by `sai/tools/change-picker.js`, the same tool `change-picker.md` runs, not re-derived here. The tool resolves; you ask. Run the tool, read its outcome, and present the matching prompt below. Do not list the changes yourself, do not second-guess an outcome, and do not let the tool phrase a question.

### The change-picker tool

Resolve the tool path exactly as `change-picker.md` § "The change-picker tool" specifies — first existing candidate per harness, copied verbatim, never composed from a root string — and stop the same way if no candidate exists. The bulk-view option is the only difference, and it is an invocation flag:

```
node <tool-path> resolve "<arguments_value>" --bulk-option --json --cwd <project-root>
```

Always pass `--bulk-option`, always pass `--json`, and always pass `--cwd` with the project root the command was invoked from. Pass `arguments_value` as the single positional argument; omit it when it is empty. `--bulk-option` prepends the bulk-view option to the two-or-more option set only; the tool never offers it on the zero- or one-change branches.

## Outcome handling

The tool reports the outcome in `outcome`, together with the ordered `options` array the prompt presents. Exit codes: **0** — a name was resolved or an option set is reported; **1** — refused, there is no active change to pick; **2** — usage error or CLI failure, reported on stderr. On exit 2 the resolution could not be completed: report that as-is, print no literal below, and do not continue as if a name had been resolved.

1. **`outcome: supplied`** (exit 0) — `resolved_name` carries the trimmed `arguments_value`. Skip the picker entirely; go to "Resolved name substitution" below.

2. **`reason: no-active-changes`** (exit 1) — the change list is empty: STOP and print exactly: "No active changes found. Run `/sai-1-spec` to create one." Do not proceed to any further processing in `sai-status`. No "See all" option is offered.

Both prompts below are closed-choice: on Claude Code and opencode, present the choices through the native option-picker; on a surface without a native picker, fall back to the plain-text prompts as written (per the "Closed-choice prompts" rule in `remember.md`). The selection semantics are identical either way. Present the tool's `options` in the reported order, using each option's `label`, and never add, drop, or reorder one.

3. **`outcome: confirm`** (exactly one change) — ask: "Use change '{name}'?" with options "yes" / "no", where `{name}` is the reported `candidate` (plain-text fallback: "Use change '{name}'? (yes/no)"). No "See all" option is offered on this branch.
   - "yes" (clicked or typed, case-insensitive) → confirm. That change's name becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (including "no", silence, or an off-topic reply) → decline. STOP. Do not resolve a name and do not proceed further in `sai-status`. No retry loop for this path.

4. **`outcome: select`** (two or more changes) — present a closed-choice prompt whose FIRST option is "See all", followed by one option per change name in the order the tool reports (plain-text fallback: a 1-indexed numbered list where option 1 is "See all" and options 2..N+1 are the change names, with the prompt "See all, or which change? Enter a number (1-{N+1})."; the reported `option_count` is that `N+1`). Present it through the native option-picker on Claude Code and opencode; on a surface without a native picker, use the plain-text fallback without changing the order or semantics.
   - **"See all"** (clicked, or the number `1` in the fallback — the option whose reported `value` is `see-all`) → print the literal line `> BULK-MODE ACTIVE` as ordinary conversation text (do NOT write it to any file) and return WITHOUT resolving a change name. `sai-status.md` detects this signal and renders the bulk status table. This mirrors the existing `> FAST-TRACK MODE ACTIVE` convention.
   - A **change option** (clicked, or a number that maps to a change name) → that change becomes the resolved change name; go to "Resolved name substitution" below. This falls through to the standard single-change `sai-status` panel, identical to the change-picker N branch.
   - Anything else (non-numeric, out of range, or a free-text reply that matches no listed option) → reject the input and re-prompt with the same options. Re-prompt unboundedly — no retry cap.

## Resolved name substitution

Once a change name is resolved (via step 1, step 3, or step 4 above), it becomes the effective `arguments_value` for the remainder of `sai-status`: every subsequent step uses the resolved name exactly as if the user had typed it. (Selecting "See all" resolves no name — it hands control to the bulk table instead.)

## Read-only invariant

`status-picker.md` SHALL NOT create, modify, or delete any file under `openspec/` (nor `.openspec.yaml`) or elsewhere. Its only side effects are the read-only `openspec list --json` call the change-picker tool makes, presenting the picker prompt, and — on "See all" — printing the `> BULK-MODE ACTIVE` signal line as conversation text.

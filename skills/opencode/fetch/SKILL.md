---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions — replicates Claude Code's built-in Fetch @ mechanism for opencode.
  This skill MUST be auto-loaded.
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Active harness and roots

Active harness identity: `opencode`.

Resolve project-local `.opencode/` before user-global `~/.config/opencode/`. This identity and root order are established before interpreting any fetch directive.

### Cross-harness routed-binding stop

Before normal resolution, inspect only the structural identity-bearing slot `bindings/<identity>/`. If `<identity>` differs from active identity `opencode`, classify the path as cross-harness and stop before checking candidate locations, reading the path, invoking a skill, recursing, rewriting, or guessing. Do not maintain a competing-harness inventory and do not infer a mismatch from arbitrary path text.

For a coordinator-owned stop, report the refused path verbatim and active identity `opencode`, direct the user to open a new chat, and offer no in-session retry. For a worker-owned stop, return the existing terminal `failed` result with a summary that names the routing stop, refused path, and active identity `opencode`; perform no automatic retry.

After a worker-owned terminal failure, an explicit user request may dispatch the original envelope to an ordinary fresh worker in the same session. Do not reuse the failed worker's journal, do not represent the dispatch as replacement-worker continuation, and leave the system-managed replacement budget unchanged.

## Fetch @ resolution rules (apply to EVERY instruction)

When you encounter `"Fetch @<path>"` or `"Also fetch @<path>"` in any instruction text, do NOT search for the file locally using glob, grep, or Read. Resolve using these rules instead:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @<subpath>` | Use glob/LS to check whether `.opencode/<subpath>` exists. If it does, Read it. Otherwise, Read `~/.config/opencode/<subpath>` directly. If that read fails, stop and report: "File not found: <subpath> (checked .opencode/ and ~/.config/opencode/)" |
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |

### Examples

Instruction text → What you do

- "Fetch @sai/policies/prereqs.md" → Check if `.opencode/sai/policies/prereqs.md` exists; if yes Read it, else Read `~/.config/opencode/sai/policies/prereqs.md` directly
- "Fetch @skills/budget/SKILL.md" → `skill("budget")`
- "Also fetch @sai/policies/remember.md" → Check if `.opencode/sai/policies/remember.md` exists; if yes Read it, else Read `~/.config/opencode/sai/policies/remember.md` directly
- "Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly." → `skill("openspec-explore")`, then follow

### Recursion

Skills you load may themselves contain `Fetch @` directives. Apply the same resolution rules recursively — the fetch rules remain active for all subsequent instructions in this session.

### File disambiguation

**Important:** `@sai/commands/X.md` and `@commands/X.md` are DIFFERENT files.

| Reference | Resolves to |
|-----------|-------------|
| `@sai/commands/X.md` | `~/.config/opencode/sai/commands/X.md` |
| `@commands/X.md` | `~/.config/opencode/commands/X.md` |

Always read the full resolved path — do NOT assume two `@` references point to the same file because their filenames match.

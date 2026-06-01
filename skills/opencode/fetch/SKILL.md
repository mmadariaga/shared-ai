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

## Fetch @ resolution rules (apply to EVERY instruction)

When you encounter `"Fetch @<path>"` or `"Also fetch @<path>"` in any instruction text, do NOT search for the file locally using glob, grep, or Read. Resolve using these rules instead:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @<subpath>` | Use glob/LS to check whether `.opencode/<subpath>` exists. If it does, Read it. Otherwise, Read `~/.config/opencode/<subpath>` directly. If that read fails, stop and report: "File not found: <subpath> (checked .opencode/ and ~/.config/opencode/)" |
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |

### Examples

Instruction text → What you do

- "Fetch @sai/instructions/prereqs.md" → Check if `.opencode/sai/instructions/prereqs.md` exists; if yes Read it, else Read `~/.config/opencode/sai/instructions/prereqs.md` directly
- "Fetch @skills/budget/SKILL.md" → `skill("budget")`
- "Also fetch @sai/instructions/remember.md" → Check if `.opencode/sai/instructions/remember.md` exists; if yes Read it, else Read `~/.config/opencode/sai/instructions/remember.md` directly
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

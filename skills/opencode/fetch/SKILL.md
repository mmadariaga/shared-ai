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

## Fetch @ resolution rules (apply to EVERY instruction)

When you encounter `"Fetch @<path>"` or `"Also fetch @<path>"` in any instruction text, resolve it using these rules:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @<subpath>` | Use Glob to check whether .opencode/<subpath> exists. If it does, use Read to load it. Otherwise, use Read on ~/.config/opencode/<subpath> directly. If that read fails, stop and report: File not found: <subpath> (checked .opencode/ and ~/.config/opencode/) |
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |

### Examples

Instruction text → What you do

- "Fetch @sai/policies/prereqs.md" → Use Glob to check whether `.opencode/sai/policies/prereqs.md` exists. If it does, use Read to load it. Otherwise, use Read on `~/.config/opencode/sai/policies/prereqs.md` directly
- "Fetch @skills/budget/SKILL.md" → `skill("budget")`
- "Also fetch @sai/policies/remember.md" → Use Glob to check whether `.opencode/sai/policies/remember.md` exists. If it does, use Read to load it. Otherwise, use Read on `~/.config/opencode/sai/policies/remember.md` directly
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

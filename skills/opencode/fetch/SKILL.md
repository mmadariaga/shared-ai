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
| `Fetch @<subpath>` | `Read .opencode/<subpath>` if exists. If file not found, `Read ~/.config/opencode/<subpath>` |
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |

### Examples

Instruction text → What you do

- "Fetch @sai/instructions/prereqs.md" → `Read .opencode/sai/instructions/prereqs.md` if exists; if absent, `Read ~/.config/opencode/sai/instructions/prereqs.md`
- "Fetch @skills/budget/SKILL.md" → `skill("budget")`
- "Also fetch @sai/instructions/remember.md" → `Read .opencode/sai/instructions/remember.md` if exists; if absent, `Read ~/.config/opencode/sai/instructions/remember.md`
- "Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly." → `skill("openspec-explore")`, then follow

### Recursion

Skills you load may themselves contain `Fetch @` directives. Apply the same resolution rules recursively — the fetch rules remain active for all subsequent instructions in this session.

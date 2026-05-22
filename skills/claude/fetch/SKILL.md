---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions for Claude Code — maps @<subpath> to
  .claude/<subpath> (project) then ~/.claude/<subpath> (global), and @skills/<name>/SKILL.md
  to the Skill tool. This skill MUST be loaded before any @sai/ fetch directive.
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Fetch @ resolution rules (apply to EVERY instruction)

When you encounter `"Fetch @<path>"` or `"Also fetch @<path>"` in any instruction text, do NOT search for the file locally using glob, grep, or Read. Resolve using these rules instead:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md` | Invoke the `Skill` tool with skill name `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Invoke the `Skill` tool with skill name `<name>`, then follow its instructions |
| `Fetch @<subpath>` (any other path) | Read `.claude/<subpath>`. If file not found, Read `~/.claude/<subpath>`. If neither exists, stop and report: "File not found: <subpath> (checked .claude/ and ~/.claude/)" |

### Examples

Instruction text → What you do

- `"Fetch @sai/instructions/prereqs.md"` → Read `.claude/sai/instructions/prereqs.md`; if absent, Read `~/.claude/sai/instructions/prereqs.md`
- `"Fetch @skills/budget/SKILL.md"` → `Skill("budget")`
- `"Also fetch @sai/instructions/remember.md"` → Read `.claude/sai/instructions/remember.md`; if absent, Read `~/.claude/sai/instructions/remember.md`
- `"Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly."` → `Skill("openspec-explore")`, then follow its instructions

### Recursion

Skills you load and files you fetch may themselves contain `Fetch @` directives. Apply the same resolution rules recursively — the fetch rules remain active for all subsequent instructions in this session.

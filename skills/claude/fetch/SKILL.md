---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions for Claude Code only — NOT compatible with opencode. Maps @<subpath> to
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
| `Fetch @<subpath>` (any other path) | Use glob/LS to check whether `.claude/<subpath>` exists. If it does, Read it. Otherwise, Read `~/.claude/<subpath>` directly. If that read fails, stop and report: "File not found: <subpath> (checked .claude/ and ~/.claude/)" |

### Examples

Instruction text → What you do

- `"Fetch @sai/instructions/prereqs.md"` → Check if `.claude/sai/instructions/prereqs.md` exists; if yes Read it, else Read `~/.claude/sai/instructions/prereqs.md` directly
- `"Fetch @skills/budget/SKILL.md"` → `Skill("budget")`
- `"Also fetch @sai/instructions/remember.md"` → Check if `.claude/sai/instructions/remember.md` exists; if yes Read it, else Read `~/.claude/sai/instructions/remember.md` directly
- `"Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly."` → `Skill("openspec-explore")`, then follow its instructions

### Recursion

Skills you load and files you fetch may themselves contain `Fetch @` directives. Apply the same resolution rules recursively — the fetch rules remain active for all subsequent instructions in this session.

### File disambiguation

**Important:** `@sai/commands/X.md` and `@commands/X.md` are DIFFERENT files.

| Reference | Resolves to |
|-----------|-------------|
| `@sai/commands/X.md` | `~/.claude/sai/commands/X.md` |
| `@commands/X.md` | `~/.claude/commands/X.md` |

Always read the full resolved path — do NOT assume two `@` references point to the same file because their filenames match.

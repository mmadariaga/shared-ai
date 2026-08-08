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

## Active harness and roots

Active harness identity: `claude`.

Resolve project-local `.claude/` before user-global `~/.claude/`. This identity and root order are established before interpreting any fetch directive.

## Fetch @ resolution rules (apply to EVERY instruction)

When you encounter `"Fetch @<path>"` or `"Also fetch @<path>"` in any instruction text, resolve it using these rules:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md` | Invoke the `Skill` tool with skill name `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Invoke the `Skill` tool with skill name `<name>`, then follow its instructions |
| `Fetch @<subpath>` (any other path) | Read `.claude/<subpath>` first; if it exists, use its content; otherwise Read `~/.claude/<subpath>` directly; if that read fails, stop and report: File not found: <subpath> (checked .claude/ and ~/.claude/) |

### Path scope

Every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root; the harness root itself is never named. A directive whose resolved path would land outside those three prefixes — a fourth top-level segment such as `@vendor/notes.md`, or a root-naming directive such as `@sai/` — is rejected before any filesystem access. Report the directive and the three permitted prefixes and stop.

### Examples

Instruction text → What you do

- `"Fetch @sai/policies/prereqs.md"` → Read `.claude/sai/policies/prereqs.md` first; if it exists, use its content. Otherwise, Read `~/.claude/sai/policies/prereqs.md` directly
- `"Fetch @skills/budget/SKILL.md"` → `Skill("budget")`
- `"Also fetch @sai/policies/remember.md"` → Read `.claude/sai/policies/remember.md` first; if it exists, use its content. Otherwise, Read `~/.claude/sai/policies/remember.md` directly
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

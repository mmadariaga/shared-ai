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

Resolve project-local `.claude/` before user-global `~/.claude/`. These are the only roots for SAI instructions: content found under any other root belongs to another harness, so reject it and stop.

### Path composition

Every agent that loads fetch inherits this rule, on both harnesses. It governs how a path is written, not where an agent may go.

- Inside the project: write paths relative to the working directory. Never compose an absolute path from the project-root string.
- Outside the project: use the path exactly as supplied. Never derive it by string manipulation.

Observed: composed absolute paths have dropped a path segment (a worker in `C:\Projects\mine\shared-ai.worktree-1` produced `C:\Projects\mine\sai\commands` for a directory inside the repository), while relative paths and literal absolute paths resolved correctly in every observed run.

## Fetch @ resolution rules (apply to EVERY instruction)

Resolve every `Fetch @<path>` or `Also fetch @<path>` directive in any instruction text by the first matching row:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md` | Invoke the `Skill` tool with skill name `<name>`, e.g. `Skill("budget")` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Invoke the `Skill` tool with skill name `<name>`, then follow its instructions |
| `Fetch @<subpath>` (any other path) | Read `.claude/<subpath>` first; if it exists, use its content; otherwise Read `~/.claude/<subpath>` directly; if that read fails, stop and report: File not found: <subpath> (checked .claude/ and ~/.claude/) |

### Path scope

Every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root; the harness root itself is never named. A directive whose resolved path would land outside those three prefixes — a fourth top-level segment such as `@vendor/notes.md`, or a root-naming directive such as `@sai/` — is rejected before any filesystem access. Report the directive and the three permitted prefixes and stop.

### Recursion

Skills you load and files you fetch may themselves contain `Fetch @` directives. Apply the same resolution rules recursively — the fetch rules remain active for all subsequent instructions in this session.

### File disambiguation

`@sai/commands/X.md` and `@commands/X.md` are different files. Always read the full resolved path, and treat two references as the same file only when their full paths match:

| Reference | Resolves to |
|-----------|-------------|
| `@sai/commands/X.md` (project-local) | `.claude/sai/commands/X.md` |
| `@sai/commands/X.md` (user-global) | `~/.claude/sai/commands/X.md` |
| `@commands/X.md` (project-local) | `.claude/commands/X.md` |
| `@commands/X.md` (user-global) | `~/.claude/commands/X.md` |

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
| `Fetch @<subpath>` | Read `.opencode/<subpath>` first; if it exists, use its content; otherwise Read `~/.config/opencode/<subpath>` directly; if that read fails, stop and report: File not found: <subpath> (checked .opencode/ and ~/.config/opencode/) |
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |

### Path scope

Every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root; the harness root itself is never named. A directive whose resolved path would land outside those three prefixes — a fourth top-level segment such as `@vendor/notes.md`, or a root-naming directive such as `@sai/` — is rejected before any filesystem access. Report the directive and the three permitted prefixes and stop.

### Examples

Instruction text → What you do

- "Fetch @sai/policies/prereqs.md" → Read `.opencode/sai/policies/prereqs.md` first; if it exists, use its content. Otherwise, Read `~/.config/opencode/sai/policies/prereqs.md` directly
- "Fetch @skills/budget/SKILL.md" → `skill("budget")`
- "Also fetch @sai/policies/remember.md" → Read `.opencode/sai/policies/remember.md` first; if it exists, use its content. Otherwise, Read `~/.config/opencode/sai/policies/remember.md` directly
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

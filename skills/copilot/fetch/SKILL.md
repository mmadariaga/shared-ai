---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions for GitHub Copilot in VS Code.
  Maps @<subpath> to .github/sai/<subpath> (project) then the VS Code user SAI
  folder (Code/User/sai/, global), and @skills/<name>/SKILL.md to the skill tool.
  This skill MUST be loaded before any @sai/ fetch directive.
license: MIT
compatibility: copilot
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Fetch @ resolution rules (apply to EVERY instruction)

When you encounter `"Fetch @<path>"` or `"Also fetch @<path>"` in any instruction text, do NOT search for the file locally using glob, grep, or Read. Resolve using these rules instead:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |
| `Fetch @<subpath>` (any other path) | Check whether `.github/sai/<subpath>` exists. If it does, read it. Otherwise, read from the VS Code SAI folder at `<subpath>`. If that read fails, stop and report: "File not found: <subpath> (checked .github/sai/ and VS Code SAI folder)" |

### VS Code folder locations

| OS | Prompts folder | SAI folder |
|----|----------------|------------|
| Windows | `%APPDATA%\Code\User\prompts` | `%APPDATA%\Code\User\sai` |
| macOS | `~/Library/Application Support/Code/User/prompts` | `~/Library/Application Support/Code/User/sai` |
| Linux | `~/.config/Code/User/prompts` | `~/.config/Code/User/sai` |

So `Fetch @sai/instructions/prereqs.md` resolves to:
- `.github/sai/instructions/prereqs.md` (project-local, if it exists), OR
- `%APPDATA%\Code\User\sai\instructions\prereqs.md` (Windows global)

### Examples

Instruction text → What you do

- `"Fetch @sai/instructions/prereqs.md"` → Check `.github/sai/instructions/prereqs.md`; if yes read it, else read from SAI folder `instructions/prereqs.md`
- `"Fetch @skills/budget/SKILL.md"` → `skill("budget")`
- `"Also fetch @sai/instructions/remember.md"` → Check `.github/sai/instructions/remember.md`; if yes read it, else read from SAI folder `instructions/remember.md`
- `"Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly."` → `skill("openspec-explore")`, then follow its instructions

### Recursion

Skills you load and files you fetch may themselves contain `Fetch @` directives. Apply the same resolution rules recursively — the fetch rules remain active for all subsequent instructions in this session.

### File disambiguation

**Important:** `@sai/commands/X.md` and `@commands/X.md` are DIFFERENT files.

| Reference | Resolves to |
|-----------|-------------|
| `@sai/commands/X.md` | `<SAI-folder>/commands/X.md` |
| `@commands/X.md` | `<prompts-folder>/commands/X.md` |

Always read the full resolved path — do NOT assume two `@` references point to the same file because their filenames match.

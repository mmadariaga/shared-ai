---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions for opencode only — NOT compatible with Claude Code. Maps @<subpath> to
  .opencode/<subpath> (project) then ~/.config/opencode/<subpath> (global) through one deterministic tool call, and @skills/<name>/SKILL.md
  to the skill tool. This skill MUST be loaded before any @sai/ fetch directive.
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "2.0"
---

## Active harness and roots

Active harness identity: `opencode`.

Resolve project-local `.opencode/` before user-global `~/.config/opencode/`. These are the only roots for SAI instructions: content found under any other root belongs to another harness, so reject it and stop.

## Fetch @ resolution rules (apply to EVERY instruction)

Resolve every `Fetch @<path>` or `Also fetch @<path>` directive in any instruction text by the first matching row:

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md` | Use the `skill` tool to load skill `<name>`, e.g. `skill("budget")` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.` | Use the `skill` tool to load skill `<name>`, then follow its instructions |
| `Fetch @<subpath>` (any other path) | Call the fetch tool below, once per directive. |

### The fetch tool

The tool sits in this skill's base directory, which the harness reports when it loads the skill. Run it in the form the installed shell permission rules cover, following `sai/policies/tool-resolution.md`:

- When the base directory is the project-local copy (`.opencode/skills/fetch` under the working directory), run it relative to the working directory exactly as written: `node .opencode/skills/fetch/fetch.js --harness opencode <subpath>`.
- Otherwise run the absolute base directory the harness reported, with backslashes turned into forward slashes and nothing else, double-quoted, and the subpath of the directive:

```
node "<base directory>/fetch.js" --harness opencode <subpath>
```

The tool looks in `.opencode/` of the working directory (a worktree included) and then in `~/.config/opencode/`, checks each subpath on every call, and uses the first file that exists. It prints a header, one blank line, and the unchanged content:

```
path: <absolute resolved path>
root: project|global
<blank line>
<content>
```

- Use the content as the fetched file. The header `path` is absolute, uses `/` separators, and comes from the resolution itself: use it as given when you need to name or Read the file, and never compose a path yourself.
- When the output holds a header and a `too-large` line instead of content, the file exceeds the output cap: Read the exact `path` from the header.
- When the tool exits with an error (the subpath is outside the scope, the file is in neither root, or the usage is wrong), stop the directive and report the tool's message.
- When the tool cannot run (permission rejected, `node` absent, or an install without `fetch.js`), stop the directive and report the failure with the action that fixes it: reinstall shared-ai, or review the shell permission for `node ~/.config/opencode/skills/fetch/fetch.js`. Do not fall back to resolving the path yourself.
- The tool takes one subpath per call and never follows `Fetch @` directives inside the content it returns.

### Path scope

The tool enforces this scope: every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root; the harness root itself is never named. A subpath outside those three prefixes — a fourth top-level segment such as `@vendor/notes.md`, a root-naming directive such as `@sai/`, an absolute path, or a path with `..` — is rejected before any filesystem access, and the `skills/<name>/SKILL.md` form is rejected with a pointer to the skill tool. Report the directive and the three permitted prefixes and stop.

### Recursion

Skills you load and files you fetch may themselves contain `Fetch @` directives. Apply the same resolution rules recursively to each one whose condition holds, one call at a time — the fetch rules remain active for all subsequent instructions in this session.

### File disambiguation

`@sai/commands/X.md` and `@commands/X.md` are different files. Treat two references as the same file only when their full resolved paths match:

| Reference | Resolves to |
|-----------|-------------|
| `@sai/commands/X.md` (project-local) | `.opencode/sai/commands/X.md` |
| `@sai/commands/X.md` (user-global) | `~/.config/opencode/sai/commands/X.md` |
| `@commands/X.md` (project-local) | `.opencode/commands/X.md` |
| `@commands/X.md` (user-global) | `~/.config/opencode/commands/X.md` |

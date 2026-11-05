---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions for Claude Code only — NOT compatible with opencode. Maps @<subpath> to
  .claude/<subpath> (project) then ~/.claude/<subpath> (global) through one deterministic tool call, and `@skills/<name>/SKILL.md`
  to the Skill tool. This skill MUST be loaded before any `@sai/` fetch directive.
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "2.0"
---

## Active harness and roots

Active harness identity: `claude`.

Resolve project-local `.claude/` before user-global `~/.claude/`. These are the only roots for SAI instructions: content found under any other root belongs to another harness, so reject it and stop.

## Fetch @ resolution rules (apply to EVERY instruction)

Resolve every `Fetch @<path>` or `Also fetch @<path>` directive in any instruction text by the first matching row.

A directive may write its path inside an inline code span, as in ``Fetch `@sai/<path>` `` or ``Also fetch `@skills/<name>/SKILL.md` ``. The backticks only wrap the path: it is the same directive as the bare form, so read the path inside the span and resolve it by the same rows. Instruction files write the backticked form so the harness does not attach each referenced file on its own.

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md`, backticked: ``Fetch `@skills/<name>/SKILL.md` `` | Invoke the `Skill` tool with skill name `<name>`, e.g. `Skill("budget")` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.`, backticked: ``Fetch `@skills/<name>/SKILL.md` and follow those instructions exactly.`` | Invoke the `Skill` tool with skill name `<name>`, then follow its instructions |
| `Fetch @<subpath>` (any other path), backticked: ``Fetch `@<subpath>` `` | Call the fetch tool below, batching the unconditional directives into one call (see Batching). |

### The fetch tool

The tool sits in this skill's base directory, which the harness reports when it loads the skill. Run it in the form the installed shell permission rules cover, following `sai/policies/tool-resolution.md`:

- When the base directory is the project-local copy (`.claude/skills/fetch` under the working directory), run it relative to the working directory exactly as written: `node .claude/skills/fetch/fetch.js --harness claude <subpath> [<subpath> ...]`.
- Otherwise run the absolute base directory the harness reported, with backslashes turned into forward slashes and nothing else, double-quoted, and the subpath of the directive:

```
node "<base directory>/fetch.js" --harness claude <subpath> [<subpath> ...]
```

The tool looks in `.claude/` of the working directory (a worktree included) and then in `~/.claude/`, checks each subpath on every call, and uses the first file that exists. A call with one subpath prints a header, one blank line, and the unchanged content:

```
path: <absolute resolved path>
root: project|global
<blank line>
<content>
```

- Use the content as the fetched file. The header `path` is absolute, uses `/` separators, and comes from the resolution itself: use it as given when you need to name or Read the file, and never compose a path yourself.
- When the output holds a header and a `too-large` line instead of content, the file exceeds the output cap: Read the exact `path` from the header.
- When the tool exits with an error (the subpath is outside the scope, the file is in neither root, or the usage is wrong), stop the directive and report the tool's message.

A call with two or more subpaths (path mode) prints only one block per subpath, in argument order, and never file content. A resolved subpath prints a resolution block; a subpath that failed prints an error block; one blank line separates the blocks:

```
subpath: <argument>
path: <absolute resolved path>
root: project|global

subpath: <argument>
error: <message>
```

- Read each `path` a resolution block returns. The `path` is absolute, uses `/` separators, and comes from the resolution itself: use it as given, and never compose a path yourself.
- When a call returns an error block (the subpath is outside the scope, the file is in neither root), stop only that subpath's directive and report the tool's message. The other directives of the batch continue.
- When the Read of a returned `path` fails (permission rejected or file unreadable), stop that directive and report the failure. Never compose or guess another path.

For every call:

- When the tool cannot run (permission rejected, `node` absent, or an install without `fetch.js`), stop the directive and report the failure with the action that fixes it: reinstall shared-ai, or review the shell permission for `node ~/.claude/skills/fetch/fetch.js`. Do not fall back to resolving the path yourself.
- The tool never follows `Fetch @` directives inside the content it returns, and a file you Read from a returned `path` is the same text.

### Batching

Resolve directives in batches, not one per turn:

1. Collect the unconditional directives known at that moment that have no loaded copy. A directive is unconditional when no condition such as "When ..." or "Before ..." governs it; a conditional directive joins a batch only once its condition holds.
2. Send the subpaths of every `Fetch @<subpath>` directive of the batch in one fetch call. In the same turn, load each `Fetch @skills/<name>/SKILL.md` directive of the batch with the `Skill` tool.
3. Read every returned `path` in parallel, in a single turn. A call that held one subpath returned its content already and needs no read.

### Path scope

The tool enforces this scope on each subpath: every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root; the harness root itself is never named. A subpath outside those three prefixes — a fourth top-level segment such as `@vendor/notes.md`, a root-naming directive such as `@sai/`, an absolute path, or a path with `..` — is rejected before any filesystem access, and the `skills/<name>/SKILL.md` form is rejected with a pointer to the Skill tool. The scope check covers every subpath of a call before any of them touches the filesystem. Report the directive and the three permitted prefixes and stop that directive.

### Recursion

Skills you load and files you fetch may themselves contain `Fetch @` directives. Apply the same resolution rules recursively to each one whose condition holds: the directives found in the files and skills of one batch form the next batch. The fetch rules remain active for all subsequent instructions in this session.

### Loaded-copy reuse

Follow a copy you already loaded in this conversation instead of loading it again. You judge this against your own context, on every directive:

- A `Fetch @<subpath>` directive whose subpath the fetch tool already returned in this conversation, with that complete content still in your context, is followed from the loaded copy, with no tool call. A complete result is the full output of a one-subpath call, the full Read of the header `path` after a `too-large` result, or the full Read of a `path` that a multi-subpath call returned.
- A `Fetch @skills/<name>/SKILL.md` directive for a skill already loaded through the `Skill` tool, with its content still in your context, is followed from the loaded skill, with no second `Skill` call.
- Run the tool or the `Skill` tool again when the loaded content has left your context (a compaction or summary that kept only a mention of it), when you are unsure it is still there, or when the earlier read was partial. A file the harness attached from an `@path` mention, and a Read of another copy of the file, are not loaded copies.
- The copy is keyed on the subpath: a copy installed under another root after the first load is picked up once the loaded content has left your context.
- Only content you loaded yourself counts. A subagent or worker never reuses the loaded copy of the agent that dispatched it, and a continued subagent reuses only what it loaded itself.

### File disambiguation

`@sai/commands/X.md` and `@commands/X.md` are different files. Treat two references as the same file only when their full resolved paths match:

| Reference | Resolves to |
|-----------|-------------|
| `@sai/commands/X.md` (project-local) | `.claude/sai/commands/X.md` |
| `@sai/commands/X.md` (user-global) | `~/.claude/sai/commands/X.md` |
| `@commands/X.md` (project-local) | `.claude/commands/X.md` |
| `@commands/X.md` (user-global) | `~/.claude/commands/X.md` |

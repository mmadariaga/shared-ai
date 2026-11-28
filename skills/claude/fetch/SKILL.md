---
name: fetch
description: >
  Resolves Fetch @<path> references in instructions for Claude Code only — NOT compatible with opencode. Maps @<subpath> to
  .claude/<subpath> (project) then ~/.claude/<subpath> (global) through one deterministic tool call, returns the
  dependency tree of the requested subpaths, and `@skills/<name>/SKILL.md` to the Skill tool. This skill MUST be loaded before any `@sai/` fetch directive.
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "3.0"
---

## Active harness and roots

Active harness identity: `claude`.

Resolve project-local `.claude/` before the user-global root, which is the directory `CLAUDE_CONFIG_DIR` names when that variable is set and `~/.claude/` otherwise. These are the only roots for SAI instructions: content found under any other root belongs to another harness, so reject it and stop.

## Fetch @ resolution rules (apply to EVERY instruction)

Resolve every `Fetch @<path>`, `Also fetch @<path>`, `Fetch? @<path>`, or `Also fetch? @<path>` directive in any instruction text by the first matching row.

A directive may write its path inside an inline code span, as in ``Fetch `@sai/<path>` `` or ``Also fetch `@skills/<name>/SKILL.md` ``. The backticks only wrap the path: it is the same directive as the bare form, so read the path inside the span and resolve it by the same rows. Instruction files write the backticked form so the harness does not attach each referenced file on its own. The `?` marker sits directly after the verb and marks the directive conditional.

| Pattern | Resolution |
|---------|-----------|
| `Fetch @skills/<name>/SKILL.md`, backticked: ``Fetch `@skills/<name>/SKILL.md` `` | Invoke the `Skill` tool with skill name `<name>`, e.g. `Skill("budget")` |
| `Fetch @skills/<name>/SKILL.md and follow those instructions exactly.`, backticked: ``Fetch `@skills/<name>/SKILL.md` and follow those instructions exactly.`` | Invoke the `Skill` tool with skill name `<name>`, then follow its instructions |
| `Fetch? @skills/<name>/SKILL.md`, `Also fetch? @skills/<name>/SKILL.md`, and their `and follow those instructions exactly` forms, backticked: ``Fetch? `@skills/<name>/SKILL.md` `` | Load skill `<name>` with the `Skill` tool, exactly as for the unmarked skill rows; the `?` records that the directive is conditional. |
| `Fetch? @<subpath>`, `Also fetch? @<subpath>`, backticked: ``Fetch? `@<subpath>` `` | Call the fetch tool as for the unmarked form. The `?` records that the directive is conditional: read it only when its condition holds. |
| `Fetch @<subpath>` (any other path), backticked: ``Fetch `@<subpath>` `` | Call the fetch tool below, batching the unconditional directives into one call (see Batching). |

### The fetch tool

The tool sits in this skill's base directory, which the harness reports when it loads the skill. Run it in the form the installed shell permission rules cover, following `sai/policies/tool-resolution.md`:

- When the base directory is the project-local copy (`.claude/skills/fetch` under the working directory), run it relative to the working directory exactly as written: `node .claude/skills/fetch/fetch.js --harness claude <subpath> [<subpath> ...]`.
- Otherwise run the absolute base directory the harness reported, with backslashes turned into forward slashes and nothing else, double-quoted, and the subpath of the directive:

```
node "<base directory>/fetch.js" --harness claude <subpath> [<subpath> ...]
```

The tool looks in `.claude/` of the working directory (a worktree included) and then in the user-global root (`CLAUDE_CONFIG_DIR`, else `~/.claude/`), checks each subpath on every call, and uses the first file that exists. A root or a file reached through a symbolic link resolves like any other, and the scope rule below is lexical only. A file that exists but cannot be read is an error of that subpath alone, reported on stderr.

**The content shape.** A call with exactly one subpath whose closure is one file prints a header, one blank line, and the unchanged content:

```
path: <absolute resolved path>
root: project|global
<blank line>
<content>
```

- Use the content as the fetched file. The header `path` is absolute, uses `/` separators, and comes from the resolution itself: use it as given when you need to name or Read the file, and never compose a path yourself.
- When the output holds a header and a `too-large` line instead of content, the file exceeds the output cap: Read the exact `path` from the header.

**The tree shape.** Every other call resolves the full closure of the requested subpaths through their `Fetch @` edges and prints a tree: a summary line, the fixed legend, then one root line per requested subpath followed by its dependencies.

```
graph: <n> entries, <n> nodes, <n> conditional, <n> skills, <n> unresolved, <n>k chars
legend: ? conditional (not now) | ~ already listed | [skill] load with the skill tool | ! unresolved
<absolute resolved path>  (<size>) (project)
  <absolute resolved path>  (<size>)
    ? [skill] <name>
```

- A node line carries the absolute resolved path and the size in thousands of characters; a node resolved in the project-local root carries ` (project)` and no suffix otherwise. Use the path as given, and never compose a path yourself.
- `?` marks a conditional edge, a directive written `Fetch? `@<path>`` or `Also fetch? `@<path>``. Read that node only when its condition, stated in the parent, holds now. A node reached only through marked edges is conditional even when its own edges are unmarked, and the tree prints `?` on every node of that conditional set, a nested node reached through a marked edge included; the number of `?` node lines then equals the summary's conditional count, aliases excluded.
- `[skill] <name>` is a skill: load it with the `Skill` tool. The tool never descends into a skill's files.
- `~ <path>  (<size>)  (already listed)` repeats a node printed earlier and adds no children.
- `! <subpath>` is a requested subpath that did not resolve, and `! <subpath>  (unresolved)` is a nested path that did not resolve. The tool's message for a requested subpath is on stderr: stop that directive and report the message.
- A directive inside a fenced code block, or inside an inline code span that holds prose around the directive, is payload for another agent: it creates no node and no error.
- The tool exits 0 when every requested subpath resolved, 1 when at least one did not, and 2 on a usage error.
- The tool lists the directives of the files it resolves; it returns no file's content except the single-leaf content shape, so a file of the tree is read only when you need it.

**Path lookup.** To locate a file without its content, name the subpath twice in one call: the tree prints one root line with its absolute resolved path and no file content.

### Batching

Resolve directives in batches, not one per turn:

1. Collect the unconditional directives known at that moment that have no loaded copy. A directive is unconditional when it is unmarked and no condition such as "When ..." or "Before ..." governs it; a marked directive joins a batch only once its condition holds.
2. Send the subpaths of every `Fetch @<subpath>` directive of the batch in one fetch call. In the same turn, load each `Fetch @skills/<name>/SKILL.md` directive of the batch with the `Skill` tool.
3. Read every node path the tree lists for the required set in parallel, in a single turn. A call that held one subpath and returned its content already needs no Read. Read a resolved subpath from the node path the tree printed, never from another fetch call within the same load, even when a later tree lists it, and read only the unconditional nodes: a conditional node is read when the condition its parent states holds.
4. Resolve every tool path the load's unconditional steps need in one path-mode call, naming each subpath twice, and read no tool file's content. A tool that only a conditional branch needs is resolved when that branch runs.

### Path scope

The tool enforces this scope on each subpath: every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root; the harness root itself is never named. A subpath outside those three prefixes — a fourth top-level segment such as `@vendor/notes.md`, a root-naming directive such as `@sai/`, an absolute path, or a path with `..` — is rejected before any filesystem access, and the `skills/<name>/SKILL.md` form is rejected with a pointer to the `Skill` tool. A nested path the tool cannot resolve is marked in the tree and changes no exit code. The scope check covers every subpath of a call before any of them touches the filesystem. Report the directive and the three permitted prefixes and stop that directive.

### Recursion

The tool resolves the closure of a call, so a batch arrives with its required dependencies. Load the skills a file names with the `Skill` tool, then apply the same rules recursively to the directives of a skill's own content and of each conditional node whose condition holds: those are the next batch. The fetch rules remain active for all subsequent instructions in this session.

### Loaded-copy reuse

Follow a copy you already loaded in this conversation instead of loading it again. You judge this against your own context, on every directive:

- A `Fetch @<subpath>` directive whose subpath the fetch tool already returned in this conversation, with that complete content still in your context, is followed from the loaded copy, with no tool call. A complete result is the full output of a one-subpath call, the full Read of the header `path` after a `too-large` result, or the full Read of a file whose node the tree listed.
- A `Fetch @skills/<name>/SKILL.md` directive for a skill already loaded through the `Skill` tool, with its content still in your context, is followed from the loaded skill, with no second `Skill` call.
- Run the tool or the `Skill` tool again when the loaded content has left your context (a compaction or summary that kept only a mention of it), or when you are unsure it is still there. A partial read is not a loaded copy: read the same path again until it is complete, and never replace it with another fetch call. A file the harness attached from an `@path` mention, and a Read of another copy of the file, are not loaded copies.
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

### Dispatch

For every call:

- When the tool cannot run (permission rejected, `node` absent, or an install without `fetch.js`), stop the directive and report the failure with the action that fixes it: reinstall shared-ai, or review the shell permission for `node ~/.claude/skills/fetch/fetch.js`. Do not fall back to resolving the path yourself.
- A file you Read from a path the tree listed is the same text the tool resolved.

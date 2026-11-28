> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Every instruction load was resolved one nesting level at a time: the fetch tool resolved only the subpaths a call named, and the agent collected the `Fetch @` directives of the files it had just read into the next batch. A command's load therefore cost one resolution round per level and depended on the agent noticing every nested directive. On this repository's 285 instruction files and 521 directives the static closure of `/sai-explore` is 20 files at depth 4 (about 211 KB) and `/sai-3-implement` is 17 files (about 178 KB), and conditional directives were indistinguishable from required ones — the reason ADR 0208 rejected a recursive preload instead of solving it.

## What Changes

- `skills/universal/fetch/fetch.js` resolves the full closure of every requested subpath through the `Fetch @` edges of Markdown files, files and skills together, deduplicated by resolved path, and prints it as an indented dependency tree: a `graph:` summary line, a fixed legend line, and one root line per requested subpath followed by its dependencies.
- A tree node line carries the absolute resolved path and its size in thousands of characters; a project-local node carries ` (project)`; a node printed earlier renders as an `already listed` alias with no children.
- The tree marks the `##` section of the parent that names an edge with `§ <heading>`, a conditional edge with `? `, a skill as `[skill] <name>` (never descended into), and an unresolved path as `! <subpath>` (`! <subpath>  (unresolved)` when nested).
- A `Fetch?` or `Also fetch?` directive marks a conditional edge; the marker sits directly after the verb, and an unmarked directive stays required. In instruction files the path stays the only token in the code span, so the marked directive is written as the bare verb, the marker, and the backticked path.
- A call keeps the content shape (`path:`, `root:`, one blank line, unchanged content, or the `too-large` line) only when it has exactly one requested subpath whose closure is one file with no edges; naming a subpath twice returns a tree with one root line and no content, which is the new path lookup.
- Every conditional directive in the repository's instruction files carries the `?` marker, and directives that were inline in a conditional sub-case or whose whole phrase sat in a code span were rewritten to the parser's form (bare verb, only the path in the span) without changing their wording.
- Both fetch skills (Claude Code and opencode, version 3.0) describe the content and tree shapes, the marked forms, path lookup, batching of the tree's required nodes, recursion, loaded-copy reuse, and the failure rules.
- `sai/policies/tool-resolution.md`, `sai/policies/prereqs-check.md`, `sai/policies/cache-warming.md`, and the instruction files that repeat the path lookup read the tree's root line: ` (project)` runs the project-local form, no suffix runs the printed absolute path, and a `!` root line with its stderr message is unresolved.
- `sai/tools/lint.js` gains the selectable `fetch-directives` check: a marker not directly after the verb, a directive phrase in a code span, a `?` directive with no condition in its paragraph or section, and an unmarked directive under a conditional `##` heading are reported.
- `sai/tools/retrospective.js` reads the new output shapes: the single-leaf content form records a load, a tree records none, a `! <subpath>` root line is a failed call, and a `too-large` output is not a failure.
- `test/fetch-tool.test.js` gains cases E1–E12, a golden tree fixture, and marked-form and lint cases; the affected instruction and reviewer tests follow the marker and directive form.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `claude-fetch-resolution`: the fetch tool's closure resolution, tree shape, node and symbol lines, single-leaf content shape, marked directive forms, recursion, and batching of the tree's nodes.
- `fetch-resolution-path-scoping`: the opencode mirror of the tree and marked forms, the shared tool's output and error reporting, and the scope rejection inside a call.
- `fetch-loaded-copy-reuse`: a complete loaded copy is also the full Read of a file whose node the tree listed.
- `fetch-directive-resolution`: the marked `Fetch?`/`Also fetch?` forms and the repository-wide marker invariant.
- `shared-tool-resolution`: path lookup reads the tree's root line and its ` (project)` marker instead of resolution blocks.
- `shared-permissions-rule`: copy selection runs a ` (project)` root line as written and a suffix-free root line as the printed absolute path.
- `sai-retrospective`: the fetch output reader recognizes the single-leaf content form, the tree, and a failed root line.
- `format-linting`: the new selectable `fetch-directives` check.
- `code-quality-priority-stack`: the pass-6 maintainability line is the marked directive.
- `routed-archive-command`, `routed-backfill-command`, `routed-commit-command`: the binding fetch literal each coordinator carries is the parser's form (bare verb, the path alone in its code span, then the instruction).

## Impact

- New behavior surface: `skills/universal/fetch/fetch.js` (closure resolution, tree and content shapes, marked edges), both fetch skills, `sai/tools/lint.js` (`fetch-directives`), `sai/tools/retrospective.js` (output shapes).
- Modified instructions: `sai/policies/tool-resolution.md`, `sai/policies/prereqs-check.md`, `sai/policies/cache-warming.md`, and the command, step, policy, and worker cards that repeat the path lookup or carry a conditional directive, across `sai/` and the two fetch skills.
- Tests: `test/fetch-tool.test.js` (E1–E12, golden tree, marked forms, lint check) and the instruction, binding, and reviewer tests whose expected text follows the marker and directive form.
- No new tool, no new dependency, and no change to the fetch invocation form; nothing is pushed.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill.

## Proposal Research Documentation

**Local files**:
- /tmp/opencode/sai/sai-transfer-1i38ls/document.md (verified change document `fetch-dependency-graph`, hash 2a07205c44b75260bacb0df46a11fbdd2102d9b66dbba217eadce1a4c2adc800)
- skills/universal/fetch/fetch.js
- skills/claude/fetch/SKILL.md
- skills/opencode/fetch/SKILL.md
- sai/tools/lint.js
- sai/tools/retrospective.js
- sai/policies/tool-resolution.md
- openspec/specs/claude-fetch-resolution/spec.md
- openspec/specs/fetch-resolution-path-scoping/spec.md
- openspec/specs/fetch-loaded-copy-reuse/spec.md
- openspec/specs/fetch-directive-resolution/spec.md
- openspec/specs/shared-tool-resolution/spec.md
- openspec/specs/shared-permissions-rule/spec.md
- openspec/specs/sai-retrospective/spec.md
- openspec/specs/format-linting/spec.md

**External URLs**:
- None.

## Request Additional Notes

- Undecided (affects I4): whether a later version descends into skill subtrees to pre-resolve their files. It depends on measuring the extra calls this version adds.

The user declared that the issue has no drift from the current code without validating it.


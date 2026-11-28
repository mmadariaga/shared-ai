# ADR 0249: Remove the fetch tree's section line

<!-- adr-index: supersedes 0247, amends 0248 -->

## Status

Accepted. Supersedes ADR 0247: its tree shape is replaced by one without the section line. Amends ADR 0248: its `?` marker stays in force, and the gate of a conditional directive is read in the parent's prose instead of a section line. ADR 0247 and ADR 0248 stay unedited.

## Context

The fetch tool's dependency tree printed a `§ <heading>` line above the nodes a parent's `##` section names, and its fixed legend named that symbol. The reading agent always reads the parent, and the condition that decides a conditional directive lives in the parent's prose, so the line answered a question the next read answers anyway. In one real load it also attributed a header-level directive to a section it does not belong to. The same load spent fetch calls it did not need: it requested again the subpaths the first tree had already resolved, and it resolved the tool paths it needed in three separate calls.

## Decision

The tree prints no `§` line, and the legend no longer names it. A conditional node keeps its `?` marker, and its gate is read in the parent's prose. The load reads each subpath a tree resolved from the absolute node path the tree printed, never requesting it from the fetch tool again within the same load, even when a later tree lists it. The parallel read covers only the unconditional nodes. Every tool path the load's unconditional steps need is resolved in one path-mode call, each subpath named twice, with no tool file's content read; a tool only a conditional branch needs is resolved when that branch runs. A partial read is read again until it is complete and is never replaced by another fetch call. The rule lives in `### Batching` of both `SKILL.md` copies, extending the sequence that exists, and the consolidated load mechanics are a paragraph in `body.md` that repeats no path. The parser keeps its section model because `sai/tools/lint.js` reuses `fetchParser` for directive form, and no consumer reads the rendered line.

## Alternatives Considered

- **An explicit path table in `body.md`.** Rejected because it duplicates paths that the directives already hold and drifts silently when a file is added.
- **Keeping the section line as the gate of a conditional directive.** Rejected because the agent reads the parent anyway, the line decides nothing on its own, and the current rendering attributed a header-level directive to a section it does not belong to.

## Consequences

- A load costs fewer fetch calls: the paths a tree resolved are read instead of requested again, and the tool paths resolve in one call.
- A reader judges a conditional directive from the parent's prose, so the tree alone no longer answers when it loads.
- The parser keeps its section model for `lint.js`; no other consumer reads a rendered section line.
- The change reaches the normative spec and two decision records, so it is wider than a tool edit and its close creates a record.

## Provenance

Change `explore-load-batching`, decision "Remove the fetch tree's section line".

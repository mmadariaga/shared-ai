# ADR 0247: Fetch resolves instruction loads as a dependency tree

<!-- adr-index: supersedes 0208 -->

## Status

Accepted. Supersedes ADR 0208: its path-mode output is replaced for every call that is not the single-leaf content call. ADR 0208 and archived changes stay unedited.

## Context

Instruction loads were resolved one nesting level at a time. The fetch tool resolved only the subpaths a call named, path mode printed `subpath:` blocks with no hierarchy, and conditional directives were indistinguishable from required ones, so an agent chased the `Fetch @` directives of the files it had just read file by file. ADR 0208 had rejected a recursive content preload because the closure is 7 to 10 times the 30 000-character output cap.

## Decision

One call resolves the full closure of the requested subpaths through the `Fetch @` edges of Markdown files, files and skills together, deduplicated by resolved path. It keeps the content shape only for exactly one requested subpath whose closure is one file with no edges: the `path:` and `root:` headers, one blank line, and the unchanged content, or the `too-large` line above the cap. Every other call prints an indented tree whose first two lines are a `graph:` summary and a fixed legend, followed by one root line per requested subpath and its dependencies. The tree carries a `?` prefix for conditional nodes, `~` aliases for a node already printed, `[skill] <name>` for a skill, `!` unresolved markers, and `§ <heading>` section lines, and every node line carries its absolute resolved path, its size in thousands of characters, and ` (project)` when it resolved project-locally. The tree is laid out by walking every required edge before any marked edge, so a required node is always printed first under a required parent; a node first printed in the marked phase carries `?`. A repeated entry prints one root line and counts once in the summary, while the raw argument count still selects the tree shape. Exit 0 reports every requested subpath resolved, exit 1 that one did not, and an unresolved nested path is marked in the tree without changing the exit code.

## Alternatives Considered

- **Recursive content preload.** Rejected for the reason ADR 0208 gives: the closure is 7 to 10 times the output cap, and the tool cannot evaluate conditions.
- **A `graph` subcommand.** Rejected as redundant: the command line stays identical, so no caller migrates.
- **A flat deduplicated list.** Rejected because it loses which file names which dependency.
- **Load manifests in frontmatter.** Rejected as a second source of truth beside the body prose.
- **Printing each condition sentence on the edge.** Rejected after a prototype produced truncated, misleading fragments; the section heading replaces it.

## Consequences

- A load arrives with its required dependencies in one call, and an agent reads the required set in one parallel batch.
- A single-file load that is not a leaf costs a tree call plus a read, one turn more than before.
- Skills stay terminal and the files they name need a later call.
- `sai/tools/retrospective.js` reads the new shapes: a tree call loads no content by itself, and an unresolved requested subpath is its `! <subpath>` root line.
- The content fast path stays for the 38 of 54 policies that are leaves, so their loads keep costing one call.

## Provenance

Change `fetch-dependency-graph`, decision "Indented tree, not a flat list".

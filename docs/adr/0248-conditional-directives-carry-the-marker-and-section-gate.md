# ADR 0248: Conditional directives carry the ? marker and the section gate

<!-- adr-index: pair with 0247 -->

## Status

Accepted.

## Context

The dependency tree needs to tell a required edge from a conditional one, and instruction files state conditions in prose that no tool can evaluate.

## Decision

A conditional directive is written with the marker directly after the verb, `Fetch? @<path>` or `Also fetch? @<path>`, backticked as the marked verb and the path alone in the span; an unmarked directive stays required. The section of the parent is the base activation gate and the `?` marker is a narrower gate inside it: a directive is active when its section applies and, if marked, its condition holds. The marker changes activation only, never resolution, and a missing file remains an error. The fetch tool classifies by the marker alone, with no heuristic. `sai/tools/lint.js fetch-directives` reports a directive that breaks the form, a `?` directive with no condition in its paragraph or section, and an unmarked directive under a conditional heading.

## Alternatives Considered

- **Load manifests in frontmatter.** Rejected as a second source of truth beside the body prose.
- **The tool evaluating conditions.** Rejected because it cannot read prose reliably.
- **An unmarked heuristic.** Rejected because it gives no classification signal.

## Consequences

- Every conditional directive in the repository's instruction files was migrated with the marker, inline conditional sub-cases moved to their own line, and the wording stayed unchanged.
- The tool never descends into skills.
- The tree counts a node reached only through marked edges as conditional even when its own edges are unmarked.

## Provenance

Change `fetch-dependency-graph`, decision "Section plus marker as the two activation gates".

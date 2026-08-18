# DDR 0142: The budget-explorer filesystem boundary starts at the harness project root

## Status

Accepted

## Context

The neutral `budget-explorer` policy requires read-only, bounded research but does
not define where filesystem discovery begins. Without an explicit boundary, an
unqualified lookup can drift into the parent repository or sibling worktrees,
making findings, permission prompts, and research cost depend on the surrounding
filesystem rather than on the active invocation.

## Decision

The harness working directory is the project root for each `budget-explorer`
invocation. It is the default and first filesystem scope for every unqualified or
speculative search, discovery, and read. When the harness starts in an active
worktree, that worktree is the root; the explorer does not broaden its initial
search to the parent repository or sibling worktrees. Root exhaustion never
authorizes self-widening. A concrete external path supplied by the task is a
directed exception governed by the purpose-bound access rule; Fetch boot and web
lookup remain outside this filesystem-scope decision.

## Alternatives Considered

- **Search the parent repository first** — rejected because the active worktree
  would no longer provide a reproducible boundary and unrelated sibling state
  could affect the result.
- **Allow only task-enumerated paths** — rejected because ordinary project-local
  discovery would become needlessly cumbersome while root-confined discovery is
  safe and useful.
- **Widen after root exhaustion** — rejected because a missing root result does
  not establish authorization to inspect unrelated external paths.

## Consequences

Filesystem research is predictable, worktree-local, and cheaper to reason about
in both supported harnesses. Relevant shared artifacts may be missed by the
initial search, so a concrete, purpose-bound directed path or a structured
escalation is required instead of implicit ancestry search. The rule applies only
to filesystem research and does not change Fetch or web behavior.

## Provenance

User — `openspec/changes/explore-agent-search-scope/design.md` records the three
qualification criteria and selects the harness project root as the boundary.

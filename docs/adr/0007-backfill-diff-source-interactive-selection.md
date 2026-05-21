# ADR 0007: Diff Source for sai-backfill Selected Interactively

## Status

Accepted

## Context

`/sai-backfill` needs to read a diff before it can produce any artifact. At invocation time
three diff sources are possible: a SHA-based range (`<sha>..HEAD`), currently staged changes,
or currently unstaged/untracked changes. A wrong diff source produces wrong artifacts with no
obvious error signal — the output looks plausible but describes the wrong change.

## Decision

Present the user with three explicit options at invocation start and block all subsequent steps
until one is selected.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Auto-infer from git state | No round-trip | Ambiguous when staged and unstaged changes coexist; fails SHA-range use case |
| Always use last commit (`HEAD~1..HEAD`) | Simple, predictable | Ignores staged-but-not-committed work; too narrow for multi-commit backfills |
| Interactive selection (chosen) | Eliminates ambiguity for all three cases | One extra round-trip per invocation |

## Consequences

- Every `/sai-backfill` invocation starts with a diff source prompt, even when the intent is obvious.
- The diff source is a hard gate before any interview question is asked or any spec is read.
- Correcting a wrong diff source requires restarting — all downstream artifacts derive from it.

## Related

- `openspec/changes/sai-backfill/specs/backfill-diff-selection/spec.md`
- ADR 0008 — Prohibited design artifacts in sai-backfill

# ADR 0173: Merge Collision Suffixes Ordered by Ascending Commit Date

## Status

Accepted

## Context

`sai-merge` repairs the ADR/DDR namespace after every merge: when two or more
records share a numeric prefix (`NNNN`), git merged them cleanly because their
filenames differ, yet the records now collide semantically under one number.
Repair renames the colliding files to lettered-suffixed names (`NNNNa-…`,
`NNNNb-…`), so an ordering rule must decide which record gets which letter.
The ordering must be deterministic from repository data alone, stable across
machines and locales, and independent of the merge direction — either branch
may be the one being merged in.

## Decision

Assign the lettered suffixes by ascending git commit date of file introduction
(oldest = `a`, next = `b`, and so on for triple-or-higher collisions),
determined via `git log --diff-filter=A --format='%ai' -- <file>`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Alphabetical by slug (chosen-against) | No git query needed | Arbitrary relative to decision history; a cosmetic rename flips seniority |
| Ascending commit date (chosen) | Reflects which decision came first; deterministic from repo metadata | Surprises after rebases or cherry-picks, which rewrite introduction dates |
| Keep both files, no suffixes | Zero churn | Leaves the semantic collision unresolved — two decisions under one number |

## Consequences

- Collision repair output is reproducible on any clone: the same group always yields the same suffix assignment.
- Rebasing or cherry-picking either colliding file before the repair runs can change its introduction date and therefore flip the assignment; operators repairing after history rewrites should verify the intended seniority.
- Index entries and relationship tokens must carry the assigned suffix, extending the pinned `NNNN` entry-line encodings handled by the decision-record index machinery.

## Related

- `openspec/specs/adr-index-maintenance/spec.md`
- ADR 0110a — Extract decision-record index machinery abstract capability
- ADR 0113 — Per-family index maintenance cycles

# DDR 0143: Intent reconciliation uses ordered classification and bounded gap questions

## Status

Accepted

## Context

The optional backfill statement can describe several capabilities or constraints
whose relationship to the selected diff is not identical. A single unstructured
comparison would lose statement order, duplicate overlapping evidence, and make
unsupported claims appear normative. An unbounded interview would also turn
backfill into a requirements-gathering session rather than a bounded
post-implementation reconstruction.

## Decision

The flow SHALL preserve intent-item statement order, then preserve selected-diff
file and hunk order for diff-only items. It SHALL classify intent items as
`matched` or `stated-but-unevidenced`, and uncovered diff items as
`evidenced-but-unstated`. Rejected alternatives remain separate context and are
never reconciliation items. The first five unevidenced items receive targeted
questions; all remaining items share one overflow question. Only an explicit
confirmation that a named behavior or boundary was deliberately preserved or
left unchanged adds `confirmed-preservation` evidence.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Ask one question for every gap | Maximizes individual clarification | Creates an unbounded, high-friction interview |
| Group all gaps into one question | Minimizes turns | Loses item-specific evidence and makes answers difficult to reconcile |
| Preserve ordered three-way classification with five-plus-overflow questions (chosen) | Keeps evidence traceable and bounds interaction cost | Some remaining gaps share one less-specific question |

## Consequences

- Equivalent complete evidence can support multiple intent items without duplicate scope drift.
- Partial or missing evidence stays non-normative until qualifying preservation evidence is supplied.
- The fixed backfill interview remains first, and generated questions are asked one at a time afterward.
- The question queue has a deterministic upper bound of six generated questions.

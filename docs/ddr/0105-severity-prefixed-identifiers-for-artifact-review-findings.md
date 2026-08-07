# DDR 0105: Severity-prefixed identifiers for artifact review findings

## Status

Accepted

## Context

Artifact reviews — the manual `sai-explore` post-crystallization review loop and the supervised pipeline's independent spec- and design-artifact reviewers — had no shared identifier scheme. `pipeline-independent-review` required only "an identifier" (free-form, reviewer-chosen), and the manual review loop defined no review output format at all. The unify-artifact-review-contract change (`review-finding-format` capability) introduces one shared contract at `sai/policies/artifact-review-contract.md` and had to choose the identifier scheme every artifact review finding carries.

The audit commands (`sai-5-review` / `sai-6-security` / `sai-7-performance` / `sai-8-accessibility`) already use severity-prefixed identifiers (`B`/`M`/`m`/`Q` and `mMUT-N`, see [ADR 0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md)), but with their own vocabularies and semantics; the artifact-review vocabulary is deliberately separate from them.

## Decision

Every artifact review finding carries an identifier derived from its `Severity` field: the severity's initial followed by the finding's sequence number within that severity in the current review (`H1`, `H2`, `M1`, `L1`, ...). The sequence restarts at 1 for each severity at the start of every review, and identifiers are review-scoped: they never imply identity across reviews or passes. The `Severity` field remains the validated source of truth; the identifier is a derived label and is never validated in place of it. A finding whose severity is missing or outside the closed set receives no derived identifier, and the pipeline's severity-contract rejection evidence preserves its reviewer-supplied identifier verbatim.

## Alternatives Considered

- **Globally sequential identifiers** (`H1`, `H2`, `H3` across severities) — rejected: the prefix would depend on occurrence order rather than the validated `Severity` field, and the sequence could not restart cleanly per review.
- **Free-form reviewer-chosen identifiers** (the pre-change state) — rejected: not deterministic, not constrained by a shared contract, and useless to the pipeline's deterministic pass reporting and rejection evidence.
- **No identifiers** — rejected: deterministic pass reporting and severity-contract rejection evidence need a stable per-finding label.

## Consequences

- Deterministic pass reporting renders severity-prefixed labels (`Finding H1` / `M1` / `L1`); the regression suite pins the `Finding\s+H\d+` / `M\d+` / `L\d+` forms, so changing the scheme is a test-breaking contract change.
- Identifier semantics stay tied to the `Severity` field, never replacing it as the validated source of truth.
- Contract-violating findings keep their reviewer-supplied identifier verbatim, so rejection evidence remains readable.
- The scheme is artifact-review-scoped; the audit commands retain their own identifier schemes ([ADR 0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md)).


# ADR 0106a: Run-path baseline predicate for the audit-append check

<!-- adr-index: pair-with 0105 -->

## Status

Accepted

## Context

Both verification stages of ADR 0105 need an evaluable predicate for "appended
by THIS invocation". A contents-based check ("`implementation.md` contains a
step for that artifact") is satisfied trivially by a step appended in an
earlier round, because the re-run contract appends one new step per artifact on
every re-run with no dedup (DDR 0021).

## Decision

Key the predicate on a per-run-path baseline: on the first-run path, the
highest `#### Step N:` number in the generated plan (the plan produced by the
current run before the audit steps are appended); on the re-run path, the
highest `#### Step N:` number present in `implementation.md` at the start of
the invocation and captured before any write. An appended step satisfies the
check only when numbered strictly after that baseline.

## Alternatives Considered

- Contents-based predicate: rejected because the no-dedup re-run contract
  makes it pass trivially on a step appended by an earlier round — exactly the
  failure it must catch.
- Persisted per-run counter of appended steps: rejected because it introduces
  durable state the change deliberately avoids; no audit trail of what one run
  appended exists in the artifact, and a persisted counter contradicts the
  run-path-only scope of the verification.

## Consequences

The two baselines already exist by contract (generated-plan highest on first
run; start-of-invocation capture on re-run — the same value the
preserve-compacted read uses), so the verification reads exactly the value the
re-run contract already reads, without introducing new durable state.

## Provenance

Codebase-forced decision recorded in the `enforce-audit-step-append-verification`
design (Decision 2).


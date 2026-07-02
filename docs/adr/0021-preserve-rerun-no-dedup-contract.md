# ADR 0021: Preserve the no-dedup re-run contract when adding audit-finding judgment

## Status

Accepted

## Context

The `audit-finding-judgment` change reworks how `sai/instructions/implement.md` ingests audit artifacts (`review.md`, `security.md`, `performance.md`, `accessibility.md`): every finding is now classified Apply or Discard via a five-criterion rubric before being appended as a code action. A natural temptation during this rework was to also add dedup logic so that re-running `/sai-3-implement` against the same unchanged audit artifact would not append a near-duplicate step.

The existing re-run preservation contract (`openspec/specs/implement-rerun-preservation/spec.md`, introduced by archived change `openspec/changes/archive/2026-06-20-sai-3-rerun-preserve-compacted`) explicitly forbids dedup: each re-run appends one new step per existing audit artifact, and `implement.md` carries a `Do NOT add audit-step dedup logic` comment. This change adds a new requirement that name-links and re-locks that contract, so a future reader of the `audit-artifact-ingestion` spec can see which contract is being preserved.

## Decision

Preserve the no-dedup re-run contract unchanged. Do not add any dedup logic across re-runs. Re-exercise the judgment rubric on every re-run and append a new step (numbered after the last existing step) each time, even when the audit artifact is unchanged. Judgment is not idempotent w.r.t. the audit artifact — two re-runs against the same unchanged artifact may produce slightly different Apply/Discard lists because the LLM is not perfectly deterministic; the appended step is best-effort, not byte-stable.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Add dedup logic so re-runs against an unchanged artifact skip appending a duplicate step | Avoids near-duplicate audit steps accumulating over re-runs | Breaks the `implement-rerun-preservation` contract and the explicit `Do NOT add audit-step dedup logic` comment in `implement.md`; dedup would need to compare free-text Apply/Discard lists, which are not byte-stable across LLM runs, making dedup itself unreliable |
| Preserve no-dedup unchanged (chosen) | Honors the existing contract; keeps the `Do NOT add audit-step dedup logic` comment verbatim; the judgment rubric is the source of truth for each step's contents, not a dedup pass | Re-runs against an unchanged artifact append near-duplicate steps; the user must close them manually |

## Consequences

- Re-running `/sai-3-implement` against an unchanged audit artifact appends a new step each time; over several re-runs, near-duplicate audit steps accumulate. The user closes extras by checking their `No code changes from this audit` (or Apply) checkboxes.
- A future change that wants dedup must first replace or relax `openspec/specs/implement-rerun-preservation/spec.md` and remove the `Do NOT add audit-step dedup logic` comment in `implement.md` — this ADR's choice is not a permanent prohibition, only the correct alignment with the existing contract for this change.
- Because judgment is not byte-stable, two appended steps for the same artifact may diverge slightly in their Apply/Discard lists; this is an LLM property, not a defect, and is documented in the spec.

## Related

- `openspec/changes/audit-finding-judgment/design.md` — Decision D7
- `openspec/changes/audit-finding-judgment/specs/audit-artifact-ingestion/spec.md` — "The re-run preservation contract SHALL be preserved" requirement
- `openspec/specs/implement-rerun-preservation/spec.md` — canonical no-dedup contract
- `openspec/changes/archive/2026-06-20-sai-3-rerun-preserve-compacted` — change that introduced the contract
- `sai/instructions/implement.md` — `Do NOT add audit-step dedup logic` comment (preserved verbatim by Step 1)

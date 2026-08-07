# DDR 0107: Unified audit severity vocabulary across the four report surfaces

## Status

Accepted

## Context

The four audit surfaces — `/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility` — each shipped its own severity vocabulary. Review used `Blocker`/`Major`/`Minor`/`Question`; security used a four-level `Critical`/`High`/`Medium`/`Low` table; performance and accessibility used five-level tables with numeric ranks. Only `/sai-5` numbered its findings at all (`B1`/`M1`/`m1`/`Q1`), and no audit report carried a closing severity tally, so the same finding was called "Major" in one report and "High" in another, and cross-report comparison and machine grep of severities were impossible. The `M1` versus `m1` case-only collision in the review report template was an accidental side effect of the case-encoded scheme.

## Decision

Adopt `Critical`/`High`/`Medium`/`Low` as the single shared audit severity vocabulary across all four audit surfaces. The mapping retires three legacy words: `Blocker` → `Critical`, `Major` → `High`, `Minor` → `Low`. `Medium` becomes newly available in `/sai-5`, defined as a moderate maintainability, performance, or test-coverage concern that does not threaten merge-readiness but should be addressed soon. `Question` remains review-only, and `Informational` remains performance/accessibility-only; no phase gains levels it does not use, and no phase's severity level set or numeric ranks change.

Every finding in every report carries a severity-prefixed identifier: the severity's initial followed by the finding's sequence within that severity in the current report (`C1`/`H1`/`M1`/`L1`, plus `Q1` for review Questions and `I1` for performance/accessibility `Informational`), restarting at 1 for each level at the start of every report. Identifiers are report-scoped and never imply identity across reports.

Every report closes with a `Summary:` tally line listing every level of the phase's subset with its count (zeros included), mirroring the artifact-review contract's base form extended per phase subset: review `Summary: Critical=<n> High=<n> Medium=<n> Low=<n> Questions=<n>`; security `Summary: Critical=<n> High=<n> Medium=<n> Low=<n>`; performance and accessibility `Summary: Critical=<n> High=<n> Medium=<n> Low=<n> Informational=<n>`.

Mutation outcomes roll up into the shared vocabulary: `survived` and `pre-check-failed` mutations count as `High`, and `revert-failed` mutations count as `Critical`, in the review counts and verdict. The `mMUT-N` namespace and the seven-field surviving-mutant row are unchanged.

## Supersedes

The severity-mapping portion of [DDR 0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md) — the mapping of `survived`/`pre-check-failed` → Major and `revert-failed` → Blocker. This DDR replaces only that severity mapping; the rest of DDR 0013 stays in force.

## Reaffirms

[DDR 0013](./0013-mmut-n-finding-namespace-for-mutation-analysis.md)'s `mMUT-N` finding namespace (N a 1-based counter over the mutation findings in the review) and the seven-field surviving-mutant row (Location, Mutation class, Original, Applied, Result, Why it survives, Suggested fix). Mutation findings are never renumbered into the `C`/`H`/`M`/`L`/`Q` sequences.

## Alternatives Considered

- **Keep per-surface vocabularies (status quo)** — rejected: blocks cross-report comparison and machine grep of severities, the exact problems this change exists to solve.
- **Adopt the artifact-review contract's `High`/`Medium`/`Low` everywhere** — rejected: that closed set deliberately excludes `Critical`, which audits need for must-fix-before-merge findings, and would conflate two distinct contracts.
- **Adopt the security surface's `Critical`/`High`/`Medium`/`Low` as the shared set** (chosen) — the smallest superset covering every phase's current levels, with `Question`/`Informational` staying phase-local because no other phase uses them.

## Consequences

- Reports written before this change live under `openspec/changes/archive/` and keep their historical vocabulary (`Blocker`/`Major`/`Minor`, `B1`/`M1`/`m1`/`Q1`); no migration or regeneration is performed.
- New reports emit the shared vocabulary and identifier scheme immediately; the `M1`/`m1` case-only collision disappears as a side effect of retiring `Minor`.
- The artifact-review contract's own `High`/`Medium`/`Low` vocabulary, its `H1`/`M1`/`L1` identifiers, and its base `Summary:` form are unchanged; audits never emit that contract's tally.
- The report template families are edited together per pair under the pinned skeleton parity — the parity guard stays at `##`-heading granularity, and the same-commit rule for severity body content is pinned normatively in the `instruction-output-templates` delta spec.

<!-- adr-index: supersedes 0013 -->

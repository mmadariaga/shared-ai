# Artifact Review Contract (shared finding format)

Single source of the artifact review finding contract. Every artifact review surface — the manual `sai-explore` post-crystallization review loop and the supervised pipeline's independent spec- and design-artifact reviewers — SHALL draw its finding format from this contract by reference. Neither `sai/commands/explore/instructions.md` nor any capability spec other than `review-finding-format` SHALL redefine the severity criteria, the finding shape, the identifier scheme, or the summary-line format inline; consuming instructions and capability specs SHALL cite this contract by reference. These semantics SHALL NOT be restated in explore or reviewer instructions.

## Scope

This contract governs **artifact review** only: read-only reviews of OpenSpec change artifacts (`proposal.md` and `specs/**` for sai-1; `design.md`, `tasks.md`, and `interfaces.md` for sai-2), whether run manually through `sai-explore`'s post-crystallization review loop or by a supervised pipeline reviewer. It does NOT govern the audit commands `sai-5-review`, `sai-6-security`, `sai-7-performance`, or `sai-8-accessibility`: those retain their own severity vocabularies and identifier schemes (e.g. `review.md`'s `C` / `H` / `M` / `L` / `Q` sections and `mMUT-N` identifiers per ADR 0013) and never emit this contract's `Summary:` tally. See the `Finding across surfaces` flagged ambiguity in the project-root `GLOSSARY.md`.

## Severity vocabulary and assignment criteria

Every artifact review finding SHALL carry exactly one severity from the closed set `High`, `Medium`, or `Low`. The reviewer SHALL NOT omit severity or emit another value (e.g. `Critical`). Assignment SHALL follow these criteria:

- **`High`** — a defect that, left uncorrected, would allow a materially incorrect, incomplete, or out-of-scope implementation, violate an explicit constraint, preserve a normative contradiction, or leave required behavior too untestable to implement reliably.
- **`Medium`** — a material clarity, coverage, consistency, or testability weakness that does not, on the reviewed evidence, prevent a bounded correct implementation or violate explicit scope.
- **`Low`** — a precision, readability, or maintainability improvement with no material effect on implementation correctness or scope.

## Finding shape

Every finding carries exactly five fields, in this order:

1. `Identifier` — the severity-prefixed label (see the identifier scheme below).
2. `Severity` — one of `High`, `Medium`, or `Low` per the criteria above; the validated source of truth.
3. `Artifact location` — the project-relative artifact path and optional section.
4. `Issue` — the reviewer's issue statement.
5. `Recommended correction` — the reviewer's recommendation.

## Identifier scheme

Each finding SHALL carry an identifier derived from its severity: the severity's initial (`H`, `M`, or `L`) followed by the finding's sequence number within that severity in the current review (`H1`, `H2`, `M1`, `L1`, ...). The sequence SHALL restart at 1 for each severity at the start of every review, and identifiers SHALL be review-scoped: they SHALL NOT imply identity across reviews or passes.

The `Severity` field SHALL remain the source of truth for severity validation; the identifier is a derived label and SHALL NOT be validated in place of the severity field.

A finding whose severity is missing or outside the closed set SHALL NOT be assigned a derived identifier. The pipeline's severity-contract rejection evidence SHALL preserve such a finding's reviewer-supplied identifier verbatim.

## Summary tally

Every artifact review SHALL close with a `Summary:` line tallying its severity counts.

- **Base form (manual review loop):** `Summary: High=<count> Medium=<count> Low=<count>` — the counts match the review's findings; no other counters.
- **Composition rule (pipeline deterministic pass reporting):** the pipeline renders the same tally prefixed by the pass number and followed by its pipeline-specific counters, e.g. `Summary: Pass <n> High=<count> Medium=<count> Low=<count> Contract-violations=<count>`. This contract defines only the base form and the composition rule; the `Contract-violations` counter is pipeline-owned and is never defined here.

## References

- `review-finding-format` capability — owns this contract's requirements normatively (delta at `openspec/changes/unify-artifact-review-contract/specs/review-finding-format/spec.md`, synced to `openspec/specs/review-finding-format/spec.md` at archive).
- `pipeline-review-severity` capability — severity criteria requirement (wording authority).
- `explore-post-crystallization-review-loop` capability — manual review loop output requirement.

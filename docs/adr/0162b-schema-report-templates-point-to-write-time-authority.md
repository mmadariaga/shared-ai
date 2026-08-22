# ADR 0162b: Schema report templates point to write-time authority

<!-- adr-index: supersedes 0106b -->

## Status

Accepted

## Context

OpenSpec schema templates under `openspec/schemas/sai-workflow/templates/` duplicated write-time SAI report and implementation contracts that the pipeline never reads when authoring artifacts. ADR 0106b pinned skeleton parity between schema scaffolds and command-owned contracts via `test/report-template-parity.test.js`, so every contract edit became a two-surface maintenance tax and a drift source.

Write-time authority already lives under `sai/commands/**` (`review-report.template.md`, `security-report.template.md`, `performance-report.template.md`, `accessibility-report.template.md`, `implementation-plan.template.md`). Schema templates remain useful only as OpenSpec CLI discoverable skeletons and as the tree `bin/setup.js` recursively copies into consumer projects.

Change `single-source-schema-report-templates` (design decisions D1–D5) retires content parity in favor of descriptive scaffolds plus tested authority pointers. ADR number 0162 is used because 0158 was already assigned to an unrelated decision.

## Decision

Make schema-side report and implementation templates descriptive scaffolds with a final HTML-comment write-time authority pointer to the matching `sai/commands/**` contract. Do not keep full field bodies, severity vocabulary, or normative finding/evidence rules on the schema side.

- Report pointers name delegated areas `severity vocabulary`, `evidence rules`, `finding shape`, and `tally line`.
- Implementation pointer names exactly `planning`, `conditional RED/GREEN`, `verification`, `STOP & COMMIT`, and `commit-authorization checklist`, targeting `sai/commands/implement/implementation-plan.template.md`.
- Schema artifact-level `instruction` blocks become the two-sentence informative-pointer formula; graph keys and top-level `apply.instruction` stay byte-identical.
- Replace `test/report-template-parity.test.js` with `test/report-template-authority.test.js` that asserts pointer scope, target existence, delegated-area wording, heading-sequence correspondence (mirroring the retired fence-extraction algorithm, including full-file fallback for the unfenced implementation authority), and absence of body field labels.
- Co-land scaffold rewrite, schema instruction pointers, and the authority test in one buildable commit boundary (ADR 0149b).
- Any STOP & COMMIT description in the implementation scaffold cites `sai/commands/apply/invocation.md` and names both the per-Step STOP & COMMIT gate and the terminal documentation commit-authorization gate — never the dissolved `sai/commands/apply/instructions.md`.

This decision **supersedes** ADR 0106b (`docs/adr/0106b-keep-both-report-template-families-pinned-parity.md`). The 0106 body remains historically accurate and unmodified. The unrelated same-number ADR `0106a-run-path-baseline-predicate.md` is out of scope and unchanged.

## Alternatives Considered

- **Keep pinned parity (ADR 0106b status quo)** — rejected: non-authoritative surface drifts and doubles maintenance.
- **Delete schema templates entirely** — rejected: OpenSpec discovery and setup copy still need a skeleton surface.
- **Unify into one shared file consumed by both sides** — rejected: would rewrite command load paths and setup; out of scope.
- **Amend ADR 0106b in place** — rejected: loses historical context and risks conflating the unrelated run-path baseline ADR sharing number 0106.
- **Add an outer fence to `implementation-plan.template.md` for extractor uniformity** — deferred: `sai/` is a hard non-goal of this change; the authority test keeps the full-file fallback.

## Consequences

- Template authors edit command-owned contracts only for write-time shape; schema scaffolds need heading/pointer maintenance only.
- Consumer projects that do not rerun setup keep full pre-change templates until they do — accepted compatibility outcome, no migration marker.
- Index consumers of the five former report-parity references land on this ADR instead of 0106.
- Heading-only correspondence allows body guidance drift; authority test pins headings, pointers, and no body field labels.

## Provenance

User — `openspec/changes/single-source-schema-report-templates/design.md`, Decisions D1–D5.

**Complexity**: high (3 capabilities, 4 requirement blocks, 9 local files, no breaking change)

## Why

The four report artifacts — `review.md`, `security.md`, `performance.md`, `accessibility.md` — each have two template families: the OpenSpec CLI scaffold at `openspec/schemas/sai-workflow/templates/` and the write-time contract at `sai/instructions/_templates/`. The scaffolds were created as mirrors of the phase instructions (`2026-05-17-sai-workflow`), but the two families have since drifted apart: the security scaffold is missing sections its own contract requires (Supply Chain Hygiene, License Risk, Policy Compliance, Acknowledged Trade-offs), the three audit write-time contracts are missing the mandatory `## Not Applicable` section that the main `sai-workflow-schema` spec already pins on the scaffold side, `security-report.md` carries a 2-space indentation defect, and every pair disagrees on the header metadata field and the review pair's Mutation Analysis field set. Nothing pins this parity, so each future template edit can silently desync the two families again. This change makes the parity normative, reconciles the current drift, and adds automated verification.

## What Changes

- Pin a new `report-template-parity` capability: for each of the four report artifacts, the schema template at `openspec/schemas/sai-workflow/templates/{artifact}.md` and the write-time contract at `sai/instructions/_templates/{artifact}-report.md` SHALL expose the same top-level section skeleton (same headings, same order) and the same header metadata field set. Divergence is allowed ONLY in placeholder syntax (`<!-- -->` vs `{...}`), fill-in guidance depth, and code-fence wrapping — the two families keep their distinct roles (CLI scaffold vs phase-fetched contract).
- Reconcile the four template pairs:
  - All four scaffolds' header metadata field labels are unified to the contracts' `**Change:**` convention (every scaffold currently uses `**Spec:**` with the `proposal.md` path; the contracts reference the change directory).
  - `review.md` pair — align the Mutation Analysis field set between the scaffold's simplified status block and the contract's full protocol (Strategy / Test command / Mutations decided / Aggregate), and align the section order to the contract's (Findings before Mutation Analysis).
  - `security.md` pair — the scaffold gains the `## Supply Chain Hygiene`, `## License Risk`, `## Policy Compliance`, and `## Acknowledged Trade-offs` headings present in the contract; the contract gains the mandatory `## Not Applicable` section with justification field.
  - `performance.md` pair — the contract gains the mandatory `## Not Applicable` section with justification field.
  - `accessibility.md` pair — the contract gains the mandatory `## Not Applicable` section with justification field.
- Fix the `sai/instructions/_templates/security-report.md` indentation defect (its fenced body is indented 2 extra spaces relative to its three sibling contracts).
- Add automated verification: a new test (`test/report-template-parity.test.js`, run by the existing `node --test` suite) asserts the pinned skeleton parity for all four pairs and fails when a heading is added or removed on one side without the other.

## Capabilities

### New Capabilities

- `report-template-parity`: For each of the four report artifacts, the schema scaffold and the write-time contract expose the same pinned section skeleton and header metadata; divergence is limited to placeholder syntax, guidance depth, and fence wrapping; automated verification enforces the pin.

### Modified Capabilities

- `sai-workflow-schema`: The "audit artifact templates always include a Not-Applicable section" requirement currently pins the scaffold family only; it is extended so the mandatory `## Not Applicable` section applies to BOTH template families (scaffold and write-time contract).
- `instruction-output-templates`: The "Audit report contracts are preserved independently" requirement currently pins the contracts' current headings and optional-section rules as extracted; it is amended because this change intentionally adds the `## Not Applicable` section to the three audit contracts, fixes the security contract indentation, and keeps their remaining sections unchanged.

## Impact

Affected files — the only files this change modifies:

- `openspec/schemas/sai-workflow/templates/review.md`
- `openspec/schemas/sai-workflow/templates/security.md`
- `openspec/schemas/sai-workflow/templates/performance.md`
- `openspec/schemas/sai-workflow/templates/accessibility.md`
- `sai/instructions/_templates/security-report.md`
- `sai/instructions/_templates/performance-report.md`
- `sai/instructions/_templates/accessibility-report.md`
- `test/report-template-parity.test.js` (new)
- `GLOSSARY.md` (appends the term **Report Template Parity**, one relationship, and the flagged ambiguity "Schema template vs instruction output template" — permitted root-glossary update, per the glossary append rules)

No `schema.yaml` instruction text changes (the security artifact instruction already references the Not Applicable section, which the contract gains), no installer/manifest changes (the `sai-instructions` recursive projection already carries `_templates/` to every harness), no harness wrappers, no worker contracts, and no generated-artifact path changes.

## Proposal Research Documentation

**Local files**: `openspec/schemas/sai-workflow/templates/review.md`; `openspec/schemas/sai-workflow/templates/security.md`; `openspec/schemas/sai-workflow/templates/performance.md`; `openspec/schemas/sai-workflow/templates/accessibility.md`; `sai/instructions/_templates/review-report.md`; `sai/instructions/_templates/security-report.md`; `sai/instructions/_templates/performance-report.md`; `sai/instructions/_templates/accessibility-report.md`; `openspec/schemas/sai-workflow/schema.yaml`; `openspec/specs/sai-workflow-schema/spec.md`; `openspec/specs/instruction-output-templates/spec.md`; `openspec/changes/archive/2026-07-29-extract-instruction-output-templates/proposal.md`; `openspec/changes/archive/2026-05-17-sai-workflow/tasks.md`; `openspec/specs/proposal-complexity/spec.md`; `GLOSSARY.md`; `AGENTS.md`; `test/design-coordinator-worker.test.js`; `test/install-manifest.test.js`; `sai/instructions/{review,security,performance,accessibility}.md`; `openspec/changes/archive/2026-07-02-audit-finding-judgment/proposal.md`.

**External URLs**: None.

## Additional Notes

- **Deliberately NOT unified.** Severity vocabularies (`B/M/m/Q` for review vs `Critical`-based for audits), verdict phrasing (incl. security's `Acceptable risk`), and review's phase-specific sections (Domain Alignment Check, Surface Triage) are intentional and pinned elsewhere — GLOSSARY.md flagged ambiguity "Finding across surfaces" and `sai/policies/artifact-review-contract.md` (which explicitly excludes sai-5..8 severities). This change pins STRUCTURE across families, never vocabulary.
- **Family roles.** The schema templates are what `openspec instructions <artifact-id>` serves as the scaffold written into a change directory; the `_templates` contracts are what the four phase instructions fetch at write time (`Fetch @sai/instructions/_templates/{artifact}-report.md`). Both families must stay in skeleton parity because a scaffold and its contract describe the same artifact.
- **Parity-test precedent.** `test/design-coordinator-worker.test.js:625` already asserts one contract across instruction, `schema.yaml`, and schema template; the new `report-template-parity.test.js` follows that pattern with heading-skeleton assertions for the four pairs.
- **Original intent.** Archive `2026-05-17-sai-workflow` task 1.8-1.11 created the schema templates "based on `instructions/sai/review.md`" etc. — mirror parity was the birth intent; the extraction change (`2026-07-29`) made the `_templates` the write-time contracts without touching the scaffolds, which is when the drift became unmanaged.
- **Schema-side consumers stay valid.** `openspec/specs/sai-workflow-schema/spec.md` pins the scaffold Not Applicable section and template presence; the `openspec/specs/proposal-complexity`, `tasks-scaffold-format`, `tasks-implementation-context`, and `proposal-research-documentation` pins touch other templates and are unaffected.
- **Deliberate reversal of extraction-era stances (recorded here for that reason).** Two stances crystallized by the template-extraction change are overturned by this change. (1) The byte-for-byte content-equivalence constraint — `openspec/specs/instruction-output-templates/spec.md` "Extraction fidelity and projection verification are explicit": "no omitted, reordered, normalized, or newly authored template content" — governed the extraction OPERATION only. This change intentionally authors new contract content (the `## Not Applicable` section in the three audit contracts, the security indentation fix) and records the amendment normatively in this change's MODIFIED `instruction-output-templates` requirement "Audit report contracts are preserved independently", so the amendment survives the archive. (2) The extraction-era framing that the templates "remain independent because their headings ... differ materially" (archive `2026-07-29-extract-instruction-output-templates` proposal) is superseded for STRUCTURE: this change pins identical top-level heading text and order across each pair and across the four report artifacts, which is why the review pair's section order and the Mutation Analysis field set are pinned to the contract's. Vocabulary differences (severity models, verdict phrasing) remain deliberate per the "Finding across surfaces" resolution; structural differences no longer are.
- **ADR/DDR recommendation for design.** The decision to keep BOTH template families and pin skeleton parity — rather than single-sourcing one family (deleting the scaffolds, or making the phase instructions fetch the schema templates instead of the contracts) — meets all three ADR criteria: hard to reverse (reconciliation cost is sunk; re-consolidating later re-touches every report artifact), surprising without context (two families for the same artifact is not self-evident), real trade-off (single-sourcing is a genuine alternative with lower drift risk but loses the scaffold-versus-contract role split). The project has an ADR culture (`docs/adr/`); `/sai-2-design` should propose this ADR so the rationale does not live only in this Additional Notes block, which is archived with the change.
- **Glossary update.** Appends the term **Report Template Parity**, one relationship, and the flagged ambiguity "Schema template vs instruction output template" to `GLOSSARY.md` per the glossary append rules; no existing term is redefined.

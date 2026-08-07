**Complexity**: high (4 modified capabilities, 16 requirements, 9 affected paths)

## Why

`sai/instructions/implement.md:95` currently asks the user "Do you want me to create `docs/adr/NNNN-slug.md` or `docs/ddr/NNNN-slug.md`?" with no criterion attached, and `sai/instructions/design.md:69` and `sai/instructions/spec.propose.md:78-85` each restate the three ADR/DDR criteria without ever distinguishing the two families — so the ADR-vs-DDR choice falls to whichever model is running. The repository now contains 93 ADRs and 20 DDRs split by hand, so the ambiguity is no longer hypothetical: this change introduces DDR (Domain Decision Record) as a second, first-class decision-record family with an ordered routing rule that decides the family deterministically, full behavioral parity with ADR including a maintained `0000-INDEX.md`, and explicit rules for relationships that cross between families.

## What Changes

- Introduce the **ordered routing test**: a decision that encodes a **domain invariant** is a DDR; otherwise it is an ADR; when both readings apply, DDR wins — the test is ordered, so there is no tie and therefore no room for improvisation.
- `/sai-2-design` records the resolved family in `design.md` as a pinned `**Record family**: adr|ddr` marker on every Decision that meets all three criteria; `/sai-3-implement` Step 3 reads that marker instead of re-deciding (fallback: Step 3 applies the routing test when the marker is absent).
- Step 3's record-creation paths become family-aware: the no-culture ask becomes a closed yes/no on creating the record that names the resolved family and never offers an ADR-vs-DDR choice.
- Instantiate the DDR family as a first-class decision-record family: `docs/ddr/`, index H1 `# DDR Index`, correction-table heading `## DDRs that extend or correct prior ones`, historical-section heading `## Superseded DDRs (historical)`, correction-table header `| DDR | Action | Over |` — inheriting the abstract surface from `decision-record-index-machinery` exactly as the ADR family does.
- The index-maintenance cycle runs once per family that received records in the run; each cycle covers only its own family's records and writes only its own family's index.
- New project-agnostic DDR index template `sai/instructions/_templates/ddr-index.md`, sibling of the ADR template, plus a parity guard test at `test/index-template-parity.test.js` pinning the two template instances together, following the existing `test/report-template-parity.test.js` precedent.
- Cross-family relationships stay permitted with the explicit `<family>:NNNN` prefix (a bare target means the same family) and `../<family>/NNNN-slug.md` links; `supersedes` remains family-bound — a crossing supersedes is a classification error resolved by moving a record, never executed.
- `openspec/schemas/sai-workflow/schema.yaml`'s design artifact wording names the family routing instead of a bare "ADR/DDR evaluation", and the design schema template carries the `**Record family**` marker guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `adr-creation-decision`: adds the ordered routing test, the `design.md` family recording, and family-aware Step 3 record creation.
- `adr-index-maintenance`: instantiates the DDR family, per-family maintenance cycles, cross-family relationship representation.
- `instruction-output-templates`: adds the DDR index template instance and the two-family index-template parity guard.
- `sai-workflow-schema`: design artifact description and instruction name the family routing; design template carries the marker guidance.

## Impact

- `sai/instructions/implement.md` (M) — Step 3 record-creation paths and index-maintenance branch selection become family-aware.
- `sai/instructions/design.md` (M) — Decisions section records the resolved family per qualifying decision.
- `sai/instructions/spec.propose.md` (M) — ADR/DDR Proposal Check resolves the family via the routing test.
- `sai/instructions/_templates/ddr-index.md` (A) — new DDR index template instance, sibling of `adr-index.md`.
- `openspec/schemas/sai-workflow/schema.yaml` (M) — design artifact description and instruction wording.
- `openspec/schemas/sai-workflow/templates/design.md` (M) — per-decision `**Record family**` marker guidance.
- `test/index-template-parity.test.js` (A) — new parity guard between the two index template instances.
- `GLOSSARY.md` (M) — four new domain terms (ADR, DDR, Decision Record Family, Domain Invariant), two new Relationships entries, and one new flagged ambiguity.
- Delta spec files under `openspec/changes/split-decision-records-into-adr-and-ddr-families/specs/` (A).
- No new dependency. Explicitly NOT touched: `docs/adr/**` and `docs/ddr/**` (the corpus was already split and repaired); `openspec/changes/archive/**` (immutable; stale `docs/adr/NNNN` paths inside it stay stale); no renumbering of any record.

## Proposal Research Documentation

**Local files**:

- sai/instructions/implement.md:89-110
- sai/instructions/design.md:62-95
- sai/instructions/spec.propose.md:78-85
- openspec/specs/adr-creation-decision/spec.md
- openspec/specs/adr-index-maintenance/spec.md
- openspec/specs/instruction-output-templates/spec.md
- openspec/specs/sai-workflow-schema/spec.md
- openspec/specs/decision-record-index-machinery/spec.md
- openspec/specs/report-template-parity/spec.md
- openspec/schemas/sai-workflow/schema.yaml:68-93
- openspec/schemas/sai-workflow/templates/design.md
- sai/instructions/_templates/adr-index.md
- docs/ddr/0000-INDEX.md
- docs/adr/0000-INDEX.md:326-348
- test/report-template-parity.test.js
- GLOSSARY.md

**External URLs**: None.

## Additional Notes

- The abstract surface (`decision-record-index-machinery`) already carries the family-boundary rules — family-bound `supersedes`; `refs`/`pair-with`/`amends`/`reframes`/`reverses` MAY cross families; `<family>:NNNN` target encoding; `../<family>/NNNN-slug.md` cross-family links. This change instantiates them for the DDR family; it does not re-derive them.
- The previous slice (`2026-08-07-parameterize-decision-record-index-machinery`) explicitly deferred "DDR family capability and the ADR-vs-DDR routing rule" and the index parity-guard test as the next slice; its cross-family rules bound then make this change a pure additive.
- The live `docs/ddr/0000-INDEX.md` already exists (hand-produced), so in this repository the DDR index's operative branch is warm splice; both branches are spec'd for consumer projects.
- The structured relationship line keeps the `adr-index:` HTML-comment key for both families (declared debt: the `adr-*` capability names describe two families while naming one).
- Numbering is independent per family; a record keeps its number when it moves between families (renumbering would invalidate roughly 190 index annotations and about 30 `docs/adr/NNNN` path references inside `openspec/changes/archive/**`, which is immutable history). The same number can exist in both families (0105 already does); the family prefix is the disambiguator.
- `docs/adr/` carries two pre-existing duplicate numbers (0106 twice, 0107 twice) that the `- [NNNN —` idempotency key cannot distinguish; declared debt, not fixed here.
- Two cross-family amends/reframes arrows remain in the corpus (`adr/0015 → ddr/0014`, `adr/0058 → ddr/0053`); they were judged legitimate and the detector flags but does not forbid them.
- The `GLOSSARY.md` update is pre-staged in the working copy: it was made during sai-1 under the spec phase's permitted root-glossary exception (`spec.propose.md` Artifact-Only Scope, the single file the spec command may touch outside `openspec/changes/{name}/`), and it belongs to this change's commit set, carried by `/sai-4-apply`.

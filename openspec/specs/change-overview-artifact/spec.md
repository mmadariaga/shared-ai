# change-overview-artifact Specification

## Purpose

Define `change-overview.md` — the per-change derived review artifact generated after the sai-2 design phase closes its initial feedback loop — as a single structured projection of the change's five source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`), including the Target State snapshot projection, completeness-and-consistency validation, and the artifact's archive and status treatment.

## Requirements

### Requirement: change-overview.md consolidates the five source artifacts

When the sai-2 design phase closes its initial feedback loop for a change, the pipeline SHALL generate a per-change artifact `openspec/changes/{change-name}/change-overview.md` — a single structured document consolidating the change's completed sai-2 source artifacts: `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, and `interfaces.md`. The overview SHALL be a separate file — it SHALL NOT be a section of `interfaces.md`, `tasks.md`, or any other artifact, and it SHALL NOT replace any of the source artifacts.

The overview is a derived projection, not a source of truth: it SHALL be generated from the source artifacts, and the source artifacts SHALL remain the authoritative records of the change. The overview SHALL be generated only after the initial feedback loop closes, per the `change-overview-synchronization` capability.

#### Scenario: overview exists as a separate derived file
- **WHEN** the initial sai-2 feedback loop closes for a change
- **THEN** `openspec/changes/{change-name}/change-overview.md` exists as a separate file next to the source artifacts
- **AND** the source artifacts remain in place, unmodified by the overview's generation

#### Scenario: overview content derives from all five source artifacts
- **WHEN** the overview is generated
- **THEN** its content is derived from `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, and `interfaces.md` of the same change
- **AND** no content is drawn from `implementation.md` or any implementation artifact

### Requirement: Overview is organized by approval-relevant capability and behavior

The overview SHALL present the proposed change as an approval-oriented projection organized by approval-relevant concern, situation, capability, and behavior, not as a concatenation of the source documents. Its top-level sections SHALL be exactly these nine headings, in this order, with no additional top-level sections:

1. `## Change Proposal` — the motivation narrative derived from `proposal.md`'s `## Why`; it SHALL carry no document-purpose preamble and SHALL NOT restate scope or capabilities.
2. `## Scope` — the in-scope and out-of-scope boundaries supported by the proposal and design artifacts.
3. `## Capabilities` — the capabilities listed in `proposal.md`'s `## Capabilities`, with `specs/**/*.md` used only to corroborate their behavior; the generator SHALL NOT synthesize a capability absent from the proposal.
4. `## Target Architecture` — an adapted review rendering of the design Architecture Snapshot and relevant target-shape decisions, retaining concise ASCII notation in a `### Snapshot` subsection when the source contains it.
5. `## Key Contracts` — approval-relevant behavioral contracts grouped by concern, derived from `design.md` decisions and `specs/**/*.md` requirements; public interface signatures and method-level test assertions are not rendered in this section.
6. `## File Manifest` — the file-level change inventory, validated against the deterministic fold and persisted manifest rules, with thematic `###` subsections permitted. Related public interface signature blocks from `interfaces.md` SHALL be interleaved beneath their corresponding file entries in this section when those files remain in the folded target-state manifest. A signature whose path folds to ∅ and therefore has no manifest entry SHALL NOT be rendered in the overview.
7. `## Review Scenarios` — approval-relevant behavioral scenarios derived from the specs and grouped by approval situation or outcome, such as authorized, rejected, failure, substitution, or semantics cases; scenarios need not be reproduced verbatim.
8. `## Implementation Approach` — a condensed ordered implementation approach derived from design and tasks; it SHALL NOT reproduce per-step `tasks.md` prose blocks such as `**What Will Be Done**`, `**Testing Strategy**`, or `**Existing Tests Broken**`.
9. `## Approval Summary` — a source-grounded condensation of the decisions, constraints, trade-offs, and review implications needed to approve the change.

Within any of the nine top-level sections, the generator MAY emit `###` subsections for editorial grouping. This permission applies equally to all nine sections, including proposal-derived capability groups, contract concern groups, scenario situation groups, and thematic manifest groups. The structural `### Snapshot` subsection remains required when the source Architecture Snapshot contains concise ASCII notation; other subsection headings are generator-authored editorial headings.

The overview SHALL NOT emit `## Target State`, `## Requirements`, `## Scenarios`, `## Interfaces`, `## Assertions`, `## File Changes`, `## Delivery Steps`, or `## Traceability` as separate top-level sections. The manifest SHALL appear only under `## File Manifest`; it SHALL NOT be repeated inside `## Target Architecture` or another section. Interface signature blocks SHALL appear only beneath their related file entries in `## File Manifest`, never as a standalone interface section or under `## Key Contracts`.

#### Scenario: overview uses the exact approval section set

- **WHEN** `change-overview.md` is generated
- **THEN** its top-level headings are exactly the nine required headings in the specified order
- **AND** no `## Target State` projection or former audit-oriented top-level section is emitted

#### Scenario: approval content is grouped without source concatenation

- **WHEN** a reader opens the overview
- **THEN** source facts are grouped under the section that best supports approval of the capability or behavior
- **AND** the overview does not reproduce each source artifact as a separate document section

#### Scenario: subsections are permitted throughout the approval structure

- **WHEN** editorial grouping improves review of any of the nine top-level sections
- **THEN** the generator MAY emit `###` subsections in that section
- **AND** subsection permission is not limited to Target Architecture or File Manifest

#### Scenario: manifest appears once at the top level

- **WHEN** the change has a non-empty file manifest
- **THEN** the manifest is rendered under `## File Manifest`
- **AND** the same manifest is not emitted in `## Target Architecture` or any other section

#### Scenario: interface signatures are retained beside manifest file entries

- **WHEN** `interfaces.md` contains a public interface signature for a file listed in the manifest
- **THEN** the signature is rendered as a related block beneath that file entry within `## File Manifest`
- **AND** the signature is not rendered under `## Key Contracts` or a separate `## Interfaces` section

#### Scenario: signature for a net-empty path is omitted

- **WHEN** an `interfaces.md` signature belongs to a path whose `tasks.md` net fold resolves to ∅ because the path is created and deleted within the change
- **THEN** the signature is not rendered in `## File Manifest` or elsewhere in the overview
- **AND** the complete signature remains available in authoritative `interfaces.md`

### Requirement: Target State remains authoritative in design.md but is not projected into the overview

The change's `## Target State` SHALL continue to be authored and persisted by the design phase in `openspec/changes/{change-name}/design.md` as the authoritative detailed finished-shape record. `design.md` SHALL continue to contain its `### Architecture Snapshot` and `### File Manifest` subsections, and `interfaces.md` SHALL continue to contain no Target State, Architecture Snapshot, or File Manifest section. The overview SHALL NOT emit a `## Target State` section or project that section verbatim.

Instead, `change-overview.md` SHALL render an adapted, approval-oriented `## Target Architecture` section from the design Architecture Snapshot and relevant design decisions. The adaptation MAY condense, regroup, and reorder source details for review, but SHALL retain the Architecture Snapshot's concise ASCII notation in a `### Snapshot` subsection when that notation is present in the source, and SHALL NOT add a fact absent from the design sources. The persisted design manifest SHALL be rendered only in the overview's top-level `## File Manifest` section.

The generator SHALL still recompute the manifest by the deterministic net fold over `tasks.md`, compare it with the persisted `### File Manifest` in `design.md`, and fail transactional validation on divergence without silently preferring either side.

#### Scenario: design Target State remains detailed and authoritative

- **WHEN** the design phase completes for a change
- **THEN** `design.md` still begins with `## Target State` followed by its existing Architecture Snapshot and File Manifest subsections
- **AND** `change-overview.md` contains no `## Target State` section

#### Scenario: Architecture Snapshot is adapted for approval

- **WHEN** the overview is generated from a design containing an Architecture Snapshot
- **THEN** the overview presents the supported architecture facts under `## Target Architecture`
- **AND** the rendering may condense or regroup them rather than reproducing the design subsection verbatim
- **AND** the rendering retains the source's concise ASCII notation in a `### Snapshot` subsection when present
- **AND** every rendered fact remains grounded in the design sources

#### Scenario: implementation approach omits step-level delivery detail

- **WHEN** the overview is generated from tasks containing per-step What Will Be Done, Testing Strategy, or Existing Tests Broken fields
- **THEN** `## Implementation Approach` presents only a condensed ordered approach
- **AND** it does not reproduce those step-level prose blocks or their broken-test detail

#### Scenario: manifest fold still blocks contradictory sources

- **WHEN** the recomputed fold from `tasks.md` differs from the persisted File Manifest in `design.md`
- **THEN** the generator reports both source locations and the one-line disagreement
- **AND** transactional validation fails without silently projecting either version

#### Scenario: public-surface sentinel is not projected

- **WHEN** a change plans no public classes, interfaces, or methods
- **THEN** the overview does not emit `None — no planned public surfaces`
- **AND** `design.md` retains its existing Target State sentinel behavior

### Requirement: Source artifacts remain authoritative and the overview permits editorial condensation

The five source artifacts SHALL remain the source of truth for the change. The overview generator MAY choose section headings, group source entries by approval-relevant concern, situation, capability, or behavior, condense source wording, and select the placement of a source-supported fact. Such editorial grouping and condensation SHALL NOT be treated as newly asserted source relationships.

The generator SHALL NOT state a fact, requirement, scenario outcome, interface contract, file change, implementation step, trade-off, or conclusion that is absent from the source artifacts. It SHALL NOT silently reword normative source content in a way that strengthens, weakens, or changes its meaning. The overview MAY summarize normative requirements and scenarios rather than reproduce them verbatim, and it SHALL cite or identify the source artifact for substantive derived content. The overview SHALL NOT modify any source artifact.

#### Scenario: source-supported condensation is accepted

- **WHEN** the generator combines several source statements into a shorter approval summary without changing their meaning
- **THEN** the condensed statement is accepted as a derived overview statement
- **AND** the source artifacts remain authoritative for the complete wording and detail

#### Scenario: editorial grouping does not create a relationship

- **WHEN** the generator places a source entry under a different approval section for readability
- **THEN** the placement alone is not presented as a new traceability relationship or source fact
- **AND** no unsupported relationship is stated because of the grouping

#### Scenario: unsourced statement is rejected

- **WHEN** a proposed overview sentence cannot be grounded in `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the generator does not emit that sentence
- **AND** validation fails if the sentence was already included in the candidate overview

#### Scenario: generation does not modify sources

- **WHEN** the overview is generated or regenerated
- **THEN** none of the five source artifacts is created, modified, or deleted

### Requirement: Blocking contradictions are reported and missing audit mappings are not required

The generator SHALL report blocking contradictions between source artifacts rather than resolve or fabricate them. A contradiction report SHALL name the conflicting source artifacts and locations and state the one-line disagreement. The persisted `### File Manifest` in `design.md` diverging from the deterministic fold over `tasks.md` remains a blocking contradiction.

The overview is not required to carry method-level assertion mappings, end-to-end traceability, or gap reports for relationships that the sources do not encode. It SHALL NOT invent those mappings merely to satisfy an obsolete audit-oriented section. Removing an unreported gap from the overview does not remove or alter the source artifacts that contain the underlying contracts.

#### Scenario: manifest contradiction fails validation with details

- **WHEN** the persisted design manifest diverges from the recomputed tasks fold
- **THEN** validation fails
- **AND** the failure details name both sources, their locations, and the disagreement

#### Scenario: absent assertion anchor is not emitted as a gap report

- **WHEN** an interface assertion has no source-encoded requirement or scenario anchor
- **THEN** the overview does not invent an anchor or emit a gap report for it
- **AND** the assertion remains available in the authoritative `interfaces.md` source

#### Scenario: source contradiction is never silently preferred

- **WHEN** two source artifacts state conflicting facts
- **THEN** the generator does not choose one silently and does not fabricate a reconciliation
- **AND** transactional validation fails with contradiction details

### Requirement: Overview is validated for the approval structure and source fidelity

At each generation, the generator SHALL construct and validate the complete approval-oriented overview before writing it. Validation SHALL confirm that the exact nine required top-level sections are present in order, the manifest fold matches the persisted design manifest, every substantive statement is grounded in one or more source artifacts, and no statement contradicts a source. Validation SHALL NOT require verbatim reproduction of requirement or scenario wording, method-level assertions, an end-to-end traceability block, or a gap report.

Acceptance SHALL remain transactional. The generator SHALL produce the complete new overview content, validate it in full against the sources, and only then write `change-overview.md` in a single atomic write. A failed generation or regeneration SHALL NOT leave partially written or partially validated output in the file.

#### Scenario: complete approval overview passes validation

- **WHEN** the candidate overview has the exact nine sections, a consistent manifest, and only source-grounded statements
- **THEN** the overview is accepted as the change's approval surface

#### Scenario: obsolete audit content is not a validation failure

- **WHEN** the candidate overview omits verbatim requirement/scenario reproductions, method-level assertions, traceability, and gap reports
- **THEN** validation does not fail for those omissions
- **AND** the authoritative source artifacts remain available for detailed audit

#### Scenario: incomplete or unsourced overview is rejected

- **WHEN** validation finds a missing required section, an out-of-order section, an ungrounded statement, a source contradiction, or manifest divergence
- **THEN** the generator reports failure rather than accepting the defective overview
- **AND** the file is not left with partially validated content

### Requirement: Target State subsections remain exact in design.md only

The `## Target State` section of `design.md` SHALL continue to admit exactly two subsections, in order: `### Architecture Snapshot` followed by `### File Manifest`, with the existing `None` behavior defined by the design-target-state capability. This exact subsection rule applies to the authoritative `design.md` Target State record; it does not impose a Target State section or admitted-subsection rule on `change-overview.md`, because the overview no longer projects Target State.

#### Scenario: design Target State retains its two subsections

- **WHEN** `design.md` is generated
- **THEN** `## Target State` contains exactly `### Architecture Snapshot` followed by `### File Manifest`
- **AND** no other subsection is emitted within that design section

#### Scenario: overview has no Target State admitted-section rule

- **WHEN** `change-overview.md` is generated
- **THEN** it contains no `## Target State` section
- **AND** its architecture content is rendered under `## Target Architecture`

#### Scenario: manifest sentinel moves to the top-level manifest section

- **WHEN** the net fold over `tasks.md` produces no lines
- **THEN** `## File Manifest` carries `None — no files affected` with its existing one-line reason
- **AND** the overview does not emit the removed public-surface sentinel

### Requirement: Overview rendering preserves structural localization anchors

Under `--overview-lang`, the overview SHALL keep all nine top-level section headings in English and SHALL translate only eligible free-text prose. This requirement owns the structural classification for this nine-section projection; `localized-overview-generation` remains authoritative for invocation language transport, projection-only scope, and language re-selection. Structural literals and source-controlled values — including the `### Snapshot` heading, source artifact names, Architecture Snapshot and File Manifest terminology, paths, commands, state values, and generator result keys — SHALL remain unchanged. Generator-authored editorial `###` subsection headings are eligible free-text prose and MAY be translated. The nine top-level section headings SHALL not be translated.

#### Scenario: localized overview keeps the nine headings in English

- **WHEN** the generator receives a non-English `overview_language`
- **THEN** all nine required top-level section headings remain in English
- **AND** eligible free prose may be rendered in the requested language

#### Scenario: localized editorial subsections remain structurally valid

- **WHEN** a localized overview uses editorial `###` subsections for contract concerns, review situations, or manifest themes
- **THEN** those generator-authored subsection headings may be translated as eligible free-text prose
- **AND** the fixed `### Snapshot` heading and all nine top-level section headings remain in English

#### Scenario: structural values remain stable under localization

- **WHEN** a localized overview contains paths, commands, state values, or source artifact names
- **THEN** those structural values remain unchanged
- **AND** localization does not alter the source-derived contracts

### Requirement: Overview is not a prerequisite or input for sai-3 or sai-4

`change-overview.md` SHALL NOT be a prerequisite or input for `sai-3-implement` or `sai-4-apply`. `sai/commands/implement/instructions.md` and `sai/commands/apply/instructions.md` SHALL continue to read the authoritative source artifacts — `interfaces.md` step contracts, `tasks.md`, `design.md`, `specs/**`, `proposal.md` — and SHALL NOT read or depend on the overview.

#### Scenario: implement ignores the overview
- **WHEN** `sai-3-implement` runs for a change that has an overview
- **THEN** the overview is not read and does not influence `implementation.md` generation
- **AND** behavior is identical to a change without an overview

#### Scenario: apply ignores the overview
- **WHEN** `sai-4-apply` runs for a change that has an overview
- **THEN** the overview is not read, is not in any step's file scope, and does not influence dispatch or execution

### Requirement: change-overview artifact registered but excluded from apply.requires

`openspec/schemas/sai-workflow/schema.yaml` SHALL register a `change-overview` artifact with `id: change-overview`, `generates: change-overview.md`, and `requires: [interfaces]`, whose transitive closure covers proposal, specs, design, tasks, and interfaces. The `change-overview` artifact SHALL NOT appear in the schema's `apply.requires` list; `apply.requires` SHALL remain `[tasks, implementation]`.

#### Scenario: change-overview registered in the artifact graph
- **WHEN** the sai-workflow schema is read
- **THEN** it contains an artifact entry with `id: change-overview`, `generates: change-overview.md`, and `requires: [interfaces]`

#### Scenario: apply is not gated on change-overview.md
- **WHEN** the schema's `apply.requires` is read
- **THEN** it lists `tasks` and `implementation` only, and does NOT list `change-overview`

### Requirement: Backfilled changes require no overview

A change whose `.openspec.yaml` records `backfilled: true` SHALL NOT be expected to produce `change-overview.md` — it has no design-stage source artifacts (`design.md`, `tasks.md`, `interfaces.md`), so the overview cannot be generated, and it SHALL carry no `overview.state` key. For backfilled changes only, the `sai/commands/archive/instructions.md` Classification Check SHALL treat `change-overview` as if it were `done` (the backfill skip treatment, exactly as it treats `interfaces`), and the `sai-status` panel SHALL NOT flag the absent overview as a problem.

For ordinary designed changes — those not backfilled — `change-overview.md` SHALL be expected after sai-2 completes: normal sai-2 completion generates and validates it as the sole review surface and commits `overview.state: current`. The archive Classification Check SHALL classify `change-overview` as **AUDIT** (informational only, like `review`) for ordinary changes, so an overview that is missing, not `done`, `overview.state: stale`, `overview.state: failed`, or `overview.state: materializing` at archive time produces the informational missing-AUDIT warning and does not block archive; a missing file warns even when the state key reads `current`, because currentness is the conjunction of the state key and the file's presence. The `sai-status` panel SHALL derive the overview state from the `overview.state` key and the CLI-reported artifact state, flagging `stale`, `failed`, `materializing`, and current-metadata-with-missing-file as problems and treating `unmaterialized` (key absent) as the expected pre-`Continue` state rather than a problem.

#### Scenario: backfilled change archives without an overview
- **WHEN** `sai-archive` runs for a change with `backfilled: true` that has no `change-overview.md`
- **THEN** the archive flow proceeds without halting, prompting, or emitting a diagnostic mentioning `change-overview`

#### Scenario: status panel does not flag absent overview on a backfilled change
- **WHEN** `/sai-status {change-name}` runs on a backfilled change with no `change-overview.md`
- **THEN** the panel does not flag the absence as a problem, matching the `interfaces` backfill treatment

#### Scenario: ordinary change with stale or missing overview surfaces a warning
- **WHEN** `sai-archive` runs for a non-backfilled change whose `overview.state` is `stale` or whose `change-overview.md` is missing or not `done`
- **THEN** the archive flow emits the informational missing-AUDIT warning naming `change-overview` and proceeds
- **AND** the missing or stale overview is not silently ignored

#### Scenario: status panel flags a stale or inconsistent overview on an ordinary change
- **WHEN** `/sai-status {change-name}` runs on a non-backfilled change whose `.openspec.yaml` records `overview.state: stale`, or whose state is `current` while `change-overview.md` is missing or not `done`
- **THEN** the panel reports the stale or inconsistent overview as a problem rather than treating it as EXEMPT

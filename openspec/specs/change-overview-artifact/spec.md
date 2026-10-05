# change-overview-artifact Specification

## Purpose

Define `change-overview.md` — the per-change derived review artifact generated after the sai-2 design phase closes its initial feedback loop — as a single structured projection of the change's five source artifacts (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`), including the Target State snapshot projection, completeness-and-consistency validation, and the artifact's archive and status treatment.

## Requirements

### Requirement: change-overview.md consolidates the five source artifacts

When an opted-in sai-2 design invocation reaches overview materialization after its initial feedback loop closes, the pipeline SHALL generate `openspec/changes/{change-name}/change-overview.md` as a separate derived document. The generator SHALL read the same change's `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, and `interfaces.md`. Selected output content SHALL come from proposal, design, tasks, and interfaces; specs SHALL corroborate sources for contradictions rather than supply additional overview content.

The overview SHALL NOT replace or modify any source artifact. Existing invocation-language selection, materialization, and regeneration rules SHALL remain in force.

#### Scenario: overview exists as a separate derived file
- **WHEN** an opted-in invocation materializes the overview after the initial sai-2 feedback loop closes
- **THEN** the overview exists separately beside the source artifacts, which remain in place and unmodified

#### Scenario: overview content derives from all five source artifacts
- **WHEN** the overview is generated
- **THEN** it selects content from proposal, design, tasks, and interfaces and consults specs for contradictions, without drawing content from implementation artifacts

### Requirement: Overview is organized by approval-relevant capability and behavior

The overview SHALL use source-oriented organization: `## Proposal`, `## Design`, followed by one `## Step N: <title>` block for every numbered Tasks Step in Tasks source order.

Under Proposal, the generator SHALL copy only the complete Why and What Changes subtrees in their source order, nesting their headings at `###`; other Proposal sections, including a WHAT heading, SHALL be omitted.

Under Design, the generator SHALL copy all present sections in source order, including additional sections not named in the template. Sections named Architecture Snapshot, File Manifest, and Context SHALL be excluded at any heading depth with their complete subtrees. Remaining hierarchy SHALL be preserved, shifting source `##` headings to `###`. An empty Target State container SHALL be omitted; one with remaining selected prose or subsections SHALL be retained.

Tasks Steps SHALL be traversed in source order, not numerically sorted. Each Step SHALL use its Tasks number and complete English title and join the corresponding Interfaces block by number, not title or position. If present, `### Interfaces` SHALL contain only the complete Interfaces and Test assertions fields in source order. `### Tasks` SHALL follow and contain only the complete Files Affected field. Other Tasks fields and non-Step sections SHALL be omitted.

Files Affected SHALL be copied literally, including repeated changes, deletions, renames, and paths that do not survive a net fold. The overview SHALL NOT replace these entries with a global manifest. For each Step with file entries, the English field label SHALL remain outside one fenced `text` block containing all entries. Entry content SHALL preserve exact change markers, paths including literals such as `<timestamp>`, whitespace, order, and repetitions.

The generator SHALL reuse an existing single fenced block rather than nest or duplicate blocks. For bare entries, indented blocks, or multiple source blocks, it SHALL replace only the block wrappers with one text fence while preserving entry contents. The fence SHALL be long enough to contain any literal fence in an entry. Explanations of absence SHALL remain outside the file-entry block; absent entries SHALL NOT require an empty block or an invented list.

Missing Interfaces blocks SHALL produce no invented interfaces or assertions. Source explanations of absence SHALL be preserved alongside selected content. A whole-file `None — no step contracts` sentinel and its reason SHALL be copied once immediately before the first Step without an added heading.

#### Scenario: overview uses the exact approval section set
- **WHEN** an overview is generated
- **THEN** its top-level organization is Proposal, Design, and each Tasks Step in source order, rather than the former nine thematic sections

#### Scenario: approval content is grouped without source concatenation
- **WHEN** a reader opens the overview
- **THEN** selected source content appears under its Proposal, Design, or corresponding Step wrapper without copying unselected document content

#### Scenario: subsections are permitted throughout the approval structure
- **WHEN** a selected source section contains nested headings
- **THEN** the overview preserves that hierarchy with only the heading-depth adjustment needed by its wrapper and adds no editorial grouping

#### Scenario: manifest appears once at the top level
- **WHEN** design contains a File Manifest and Tasks contain per-Step Files Affected
- **THEN** the overview excludes the design manifest and copies each Step's literal Files Affected entries in one fenced text block under its Tasks wrapper without a top-level manifest

#### Scenario: interface signatures are retained beside manifest file entries
- **WHEN** an Interfaces Step contains signatures
- **THEN** the complete signatures appear in that same-numbered overview Step's Interfaces field before its Tasks wrapper, without manifest-based placement

#### Scenario: signature for a net-empty path is omitted
- **WHEN** a selected Interfaces signature names a path created and deleted across Tasks Steps
- **THEN** the overview retains that signature and the corresponding literal per-Step file entries instead of omitting them based on the net fold

#### Scenario: Tasks source order differs from numeric order
- **WHEN** Tasks lists Step 3 before Step 1
- **THEN** the overview lists Step 3 before Step 1 and joins each Interfaces block by its number

#### Scenario: Step has no Interfaces block
- **WHEN** a Tasks Step has no corresponding Interfaces block
- **THEN** its overview Step contains only its Tasks wrapper and selected Files Affected, with no invented contract fields

#### Scenario: whole-file absence explanation is present
- **WHEN** Interfaces contains the whole-file no-step-contracts sentinel and its reason
- **THEN** the overview copies that explanation once immediately before the first Tasks Step

#### Scenario: file entries contain Markdown-sensitive literals
- **WHEN** a Step's Files Affected entries include `<timestamp>`, repeated paths, change markers, deletions, or renames
- **THEN** one fenced text block preserves every entry literally in source order beneath the English field label

#### Scenario: file entries already use block wrappers
- **WHEN** selected Files Affected entries use a single fenced block, indented blocks, or multiple source blocks
- **THEN** the overview emits one non-nested text block, reusing a single existing block where applicable and otherwise replacing only wrappers while preserving all entry contents with a sufficiently long fence

#### Scenario: file entries are absent
- **WHEN** selected source content explains that no file entries are present
- **THEN** the explanation remains outside any file-entry block without an invented list or required empty block

### Requirement: Target State remains authoritative in design.md but is not projected into the overview

Design SHALL remain authoritative for its Target State, Architecture Snapshot, and deterministic File Manifest. Interfaces SHALL continue to carry per-Step contracts rather than Target State, snapshot, or manifest sections.

Overview generation SHALL exclude Architecture Snapshot and File Manifest subtrees rather than adapt or fold them. It SHALL preserve remaining selected Target State content and hierarchy, omitting that heading only if exclusion leaves it empty. It SHALL NOT require `file-manifest.js verify` as overview validation. Existing design manifest generation and verification behavior outside overview generation SHALL remain unchanged.

#### Scenario: design Target State remains detailed and authoritative
- **WHEN** the design phase completes for a change
- **THEN** design retains its authoritative Target State and existing snapshot and manifest structure while the overview independently applies its source-selection exclusions

#### Scenario: Architecture Snapshot is adapted for approval
- **WHEN** a design contains an Architecture Snapshot
- **THEN** the overview excludes that complete subtree instead of rendering an adapted Target Architecture or Snapshot section

#### Scenario: implementation approach omits step-level delivery detail
- **WHEN** Tasks contains What Will Be Done, Testing Strategy, and Existing Tests Broken fields
- **THEN** the overview omits those fields and copies only Files Affected beneath each Step's Tasks wrapper

#### Scenario: manifest fold still blocks contradictory sources
- **WHEN** the persisted design manifest differs from the Tasks net fold
- **THEN** overview generation does not run manifest-fold verification or select either manifest as output, and existing design-tool verification remains independent

#### Scenario: public-surface sentinel is not projected
- **WHEN** Architecture Snapshot contains the no-planned-public-surfaces sentinel
- **THEN** the overview excludes it with the snapshot subtree while design retains its existing sentinel behavior

#### Scenario: remaining Target State content survives exclusions
- **WHEN** Target State contains selected prose or another non-excluded subsection
- **THEN** the overview retains the Target State heading and that complete remaining content

#### Scenario: Target State becomes empty
- **WHEN** removing excluded subtrees leaves Target State with no content
- **THEN** the overview omits the empty Target State heading

### Requirement: Source artifacts remain authoritative and the overview permits editorial condensation

Source artifacts SHALL remain authoritative. The overview SHALL transfer complete selected content without summarizing, condensing, rewriting, or adding source content. Complete transfer SHALL include every standalone paragraph, list item, table row, reference, identifier, test assertion, and selected field's complete content, including apparently redundant assertions.

The overview SHALL preserve lists and order, tables and all rows, emphasis, links, blockquotes, fenced and indented blocks, and whitespace inside blocks. The only formatting exceptions SHALL be adjusting actual Markdown heading depth to fit the containing structure and wrapping Files Affected entries in the specified single text block. Heading-like text inside code blocks SHALL remain untouched.

Selected text already in the effective overview language SHALL be copied verbatim apart from those permitted formatting exceptions. Other selected natural-language explanatory prose SHALL be translated without changing meaning or formatting. All actual headings, complete Step titles, and structural field labels SHALL remain English. Code, signatures, paths, identifiers, test expressions, commands, state values, source artifact names, result keys, and other technical literals SHALL remain unchanged, including inline code and code blocks.

The generator SHALL NOT modify source artifacts or invent source relationships, assertions, audit mappings, conclusions, or facts. Absent selected sections and fields SHALL be omitted rather than filled with placeholders; source explanations of absence SHALL be preserved.

#### Scenario: source-supported condensation is accepted
- **WHEN** a candidate condenses several selected source statements into a shorter summary
- **THEN** validation rejects the condensation because complete selected content must be preserved

#### Scenario: editorial grouping does not create a relationship
- **WHEN** selected content belongs to a source section or numbered Step
- **THEN** the overview preserves that source relationship and does not regroup it editorially or assert an unsupported relationship

#### Scenario: unsourced statement is rejected
- **WHEN** a proposed overview sentence is absent from selected source content
- **THEN** the generator omits it and validation rejects a candidate that includes it

#### Scenario: generation does not modify sources
- **WHEN** the overview is generated or regenerated
- **THEN** no source artifact is created, modified, or deleted by generation

#### Scenario: selected Markdown formatting remains intact
- **WHEN** selected content contains ordered lists, tables, links, blockquotes, and code blocks
- **THEN** the complete selected structures and their order remain intact, including all table rows and whitespace inside blocks, except for permitted heading-depth adjustment and Files Affected wrapper normalization

#### Scenario: heading-like code stays untouched
- **WHEN** a selected code block contains text that resembles Markdown headings
- **THEN** neither heading-depth adjustment nor the English-heading rule changes that code text

#### Scenario: optional section is absent
- **WHEN** a selected section or field is absent from the source
- **THEN** the overview omits it without inventing content or rendering template placeholders

#### Scenario: selected content appears redundant
- **WHEN** selected source content includes standalone paragraphs, references, or apparently redundant test assertions
- **THEN** the overview transfers every selected unit completely rather than treating redundancy as permission to omit it

### Requirement: Blocking contradictions are reported and missing audit mappings are not required

The generator SHALL report blocking source contradictions rather than resolve or fabricate them. Each report SHALL identify both source locations and the one-line disagreement. Duplicate Step numbers in either Tasks or Interfaces, an Interfaces Step absent from Tasks, and conflicting source content SHALL be blocking contradictions. Missing Interfaces blocks alone SHALL be permitted.

Specs SHALL be corroborating sources, not additional overview output. Overview validation SHALL NOT require manifest-fold comparison or invented assertion anchors, traceability, or gap reports. Selected Test assertions SHALL nevertheless be copied completely.

#### Scenario: manifest contradiction fails validation with details
- **WHEN** overview generation encounters an excluded design manifest that differs from the Tasks net fold
- **THEN** that fold difference does not itself trigger overview manifest validation, because overview generation uses literal per-Step Files Affected instead

#### Scenario: absent assertion anchor is not emitted as a gap report
- **WHEN** a selected interface assertion has no source-encoded requirement or scenario anchor
- **THEN** the overview copies the assertion without inventing an anchor or adding a gap report

#### Scenario: source contradiction is never silently preferred
- **WHEN** two corroborating or selected sources state conflicting content
- **THEN** transactional validation fails with both locations and the disagreement rather than silently preferring one or fabricating reconciliation

#### Scenario: duplicate Step numbers are rejected
- **WHEN** Tasks or Interfaces contains duplicate Step numbers
- **THEN** generation reports the conflicting source locations and fails transactionally rather than merging or choosing a block

#### Scenario: orphan Interfaces Step is rejected
- **WHEN** an Interfaces Step number does not exist in Tasks
- **THEN** generation reports the source mismatch and fails without inventing a Tasks Step

### Requirement: Overview is validated for the approval structure and source fidelity

The generator SHALL validate the complete candidate against source selection, complete content, formatting preservation, eligible translation, technical-literal preservation, and Step-number correspondence before writing. Validation SHALL confirm Proposal followed by Design followed by Tasks-ordered Step blocks, with any whole-file absence explanation immediately before the Steps. Every Tasks Step SHALL appear once with its own selected Files Affected and exactly its corresponding selected Interfaces content when present.

Validation SHALL check the source-driven Design selection, excluded subtrees, omitted absent content, and empty Target State handling. It SHALL reject dropped or added selected content and source contradictions. It SHALL NOT impose a fixed Design allowlist or the obsolete thematic heading set.

Before accepting generation or regeneration, the generator SHALL compare each selected source unit with its candidate counterpart. Every standalone paragraph, list item, table row, reference, identifier, test assertion, and complete field content SHALL be accounted for in source order. Translated prose SHALL preserve complete meaning, and technical literals SHALL match exactly. Section presence alone SHALL NOT establish completeness.

Validation SHALL confirm that all actual headings, including complete Step titles, and structural field labels remain English while explanatory prose uses the selected overview language. Each Step with file entries SHALL have exactly one file-entry text block without duplicate or nested wrappers. Entry content SHALL preserve `<timestamp>` and other path literals, change markers, whitespace, order, and repetitions. All other Markdown formatting SHALL remain preserved except permitted heading-depth adjustment.

Any missing selected unit or failed candidate fidelity or rendering check SHALL prevent acceptance and return `validation-failed` through the existing failure-record and result-envelope rules. Source contradictions SHALL remain `blocking-contradiction`, with both source locations and the one-line disagreement reported.

Acceptance SHALL remain transactional: the complete candidate SHALL be validated before a single atomic write. Failed generation or regeneration SHALL NOT leave partially written or partially validated candidate output. Existing complete diagnostic-record behavior SHALL remain available for generator-run failures.

#### Scenario: complete approval overview passes validation
- **WHEN** a complete source-oriented candidate satisfies every mapping and fidelity check
- **THEN** it is accepted and written atomically as the change's overview

#### Scenario: obsolete audit content is not a validation failure
- **WHEN** a candidate omits unselected standalone requirements, scenarios, traceability, and gap reports but preserves all selected Interfaces and Test assertions
- **THEN** those unselected omissions do not fail validation

#### Scenario: incomplete or unsourced overview is rejected
- **WHEN** a candidate drops selected content, adds content, changes source order or Step correspondence, changes technical literals, or contains a source contradiction
- **THEN** validation reports `validation-failed` for candidate fidelity or rendering defects or `blocking-contradiction` for source contradictions, without leaving a partially validated candidate as the overview

#### Scenario: additional Design section is present
- **WHEN** Design contains a non-excluded section absent from the template's examples
- **THEN** validation requires its complete content in source order rather than applying a fixed section allowlist

#### Scenario: all headings exist but selected units are missing
- **WHEN** a candidate contains all required headings but omits a selected standalone paragraph, citation, or apparently redundant assertion
- **THEN** generation or regeneration fails with `validation-failed` before accepting the candidate

#### Scenario: localized candidate or file-entry presentation is incorrect
- **WHEN** a candidate translates a heading or structural label, loses explanatory meaning, changes literal file-entry content, or emits duplicate or nested file-entry wrappers
- **THEN** validation returns `validation-failed` and prevents acceptance

### Requirement: Target State subsections remain exact in design.md only

Authoritative design Target State SHALL continue to contain exactly Architecture Snapshot followed by File Manifest, with existing design-target-state absence behavior. That design-authoring rule SHALL NOT create an overview allowlist or override overview exclusions. The overview SHALL copy remaining selected Target State content when present and omit the container when empty after exclusions.

#### Scenario: design Target State retains its two subsections
- **WHEN** design is generated
- **THEN** Target State contains Architecture Snapshot followed by File Manifest without an additional sibling subsection

#### Scenario: overview has no Target State admitted-section rule
- **WHEN** the overview is generated
- **THEN** its Design selection follows present source content and exclusions rather than the design Target State authoring rule

#### Scenario: manifest sentinel moves to the top-level manifest section
- **WHEN** the design manifest carries its no-files-affected sentinel
- **THEN** the overview excludes that sentinel with File Manifest and still copies selected per-Step Files Affected instead of moving the sentinel to a global overview manifest

### Requirement: Overview rendering preserves structural localization anchors

The generator SHALL keep all actual Markdown headings, including complete Step titles, selected source headings, and structural field labels English regardless of the selected overview language. The English wrappers SHALL include `## Proposal`, `## Design`, `## Step N: <title>`, `### Interfaces`, and `### Tasks`.

Only natural-language explanatory prose SHALL be eligible for translation. Structural labels SHALL mean section or field names, not every emphasized explanatory phrase. Heading-like text inside code SHALL remain unchanged code. Technical literals SHALL remain unchanged according to the faithful-copy rule. Existing invocation-language transport, projection-only scope, and language re-selection SHALL remain owned by localized-overview-generation.

#### Scenario: localized overview keeps the nine headings in English
- **WHEN** a generator receives a non-English overview language
- **THEN** it keeps all source-oriented headings, including full Step titles, and structural labels English rather than emitting the former nine thematic headings

#### Scenario: localized editorial subsections remain structurally valid
- **WHEN** selected source content includes headings and descriptive structural labels
- **THEN** those headings and labels remain English while explanatory prose translates faithfully and no editorial grouping is invented

#### Scenario: structural values remain stable under localization
- **WHEN** selected content contains paths, commands, state values, source artifact names, signatures, identifiers, or test expressions
- **THEN** those technical values remain unchanged and translation does not alter their contracts

### Requirement: Overview is not a prerequisite or input for sai-3 or sai-4

`change-overview.md` SHALL NOT be a prerequisite or input for `sai-3-implement` or `sai-4-apply`. The `sai-3-implement` step library (`sai/commands/implement/steps/`) and `sai/commands/apply/instructions.md` SHALL continue to read the authoritative source artifacts — `interfaces.md` step contracts, `tasks.md`, `design.md`, `specs/**`, `proposal.md` — and SHALL NOT read or depend on the overview.

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

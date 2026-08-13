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

### Requirement: Overview is organized by capability and behavior

The overview SHALL present the proposed change as a review-oriented projection organized by capability and behavior, not as a concatenation of the source documents. The overview SHALL present, at minimum: scope, target architecture, requirements, scenarios, interfaces, method-level test assertions, file changes, delivery steps, and end-to-end traceability — linking requirements to their scenarios, interfaces, test assertions, and delivery steps by capability and behavior.

The traceability and method-level assertion content SHALL be the content the source artifacts already encode: the shared `Step N` keys of `tasks.md` and `interfaces.md`, the assertion→requirement/scenario anchors in `interfaces.md` Test assertions, and the requirement→scenario structure of `specs/**/*.md`. The overview SHALL NOT synthesize relationships or method-level mappings the sources do not encode; a required element that the sources cannot support SHALL be reported as a gap per the report-not-fabricate requirement, not invented. Introducing a new source-level traceability identifier scheme is out of scope for this change.

#### Scenario: review sections are organized by capability
- **WHEN** a reader opens the overview
- **THEN** the content is grouped by capability and behavior, so a requirement's scenarios, interfaces, and assertions are traceable within its capability
- **AND** no section is a raw copy of a source document's section

#### Scenario: requirements-to-implementation traceability is present
- **WHEN** a capability in the change has requirements, scenarios, interfaces, and delivery steps
- **THEN** the overview links each requirement to its scenarios, to the interfaces that realize it, to the method-level test assertions that verify it, and to the delivery steps that implement it
- **AND** every such link traces to an occurrence in a source artifact

#### Scenario: unencoded traceability is reported, not synthesized
- **WHEN** the sources do not encode a mapping the overview must present (for example a requirement with no anchored assertion in `interfaces.md`)
- **THEN** the overview reports the missing relationship as a gap, naming the sources involved
- **AND** the overview does not invent the mapping

### Requirement: Target State is authored in design.md and projected into the overview

The change's `## Target State` review snapshot SHALL be authored and persisted by the design phase as a dedicated section of `openspec/changes/{change-name}/design.md` — the authoritative source for the snapshot — including its `### Architecture Snapshot` and `### File Manifest` subsections as defined by the `design-target-state` capability. The snapshot SHALL NOT be emitted in `interfaces.md`, and SHALL NOT live only in transient worker context: every element of the snapshot SHALL be reproducible at regeneration time by reading `design.md` and `tasks.md`, never by synthesizing it anew. `interfaces.md` SHALL contain no `## Target State` section and no `### Architecture Snapshot` or `### File Manifest` subsection — every top-level section of `interfaces.md` SHALL be a `## Step N` contract.

`change-overview.md` SHALL project the change's `## Target State` from `design.md` as its leading review section: the `### Architecture Snapshot` subsection SHALL be projected verbatim from `design.md`, and the `### File Manifest` subsection SHALL be recomputed by the deterministic net fold over `tasks.md` per the `design-target-state` capability and **validated against the persisted `### File Manifest` in `design.md`**. The persisted manifest remains authoritative: the generator SHALL compare the recomputed fold to the persisted manifest, project the persisted one only when the two are equal, and when they differ SHALL NOT silently prefer either side — it SHALL report the source contradiction per the report-not-fabricate requirement and fail the transactional validation. The overview SHALL NOT author, reword, or synthesize the snapshot content; the per-step `## Step N` sections of `interfaces.md` SHALL remain the authority on step attribution and exact assertions.

#### Scenario: Target State lives in design.md and is projected
- **WHEN** a change's design phase completes
- **THEN** `design.md` contains a `## Target State` section with `### Architecture Snapshot` and `### File Manifest` subsections
- **AND** `change-overview.md` projects that section as its leading review section without rewriting its content
- **AND** `interfaces.md` contains no `## Target State` section and no snapshot or manifest subsection

#### Scenario: regeneration reproduces the snapshot from persisted sources
- **WHEN** the overview is regenerated after source artifacts changed
- **THEN** the `## Target State` content is read from `design.md` and the `### File Manifest` is recomputed from `tasks.md` by the deterministic net fold
- **AND** no snapshot element is synthesized or invented by the generator

#### Scenario: persisted manifest matches the recomputed fold
- **WHEN** the generator recomputes the `### File Manifest` from `tasks.md` and it equals the persisted manifest in `design.md`
- **THEN** the persisted manifest is projected into the overview unchanged

#### Scenario: persisted manifest diverges from the recomputed fold
- **WHEN** the recomputed `### File Manifest` fold from `tasks.md` differs from the persisted manifest in `design.md`
- **THEN** the generator does NOT project either side silently
- **AND** it reports the source contradiction, naming both the `design.md` manifest and the `tasks.md` fold as the diverging sources
- **AND** the transactional validation fails, so the defective overview is not accepted

#### Scenario: interfaces.md keeps only step contracts
- **WHEN** a reader scans `interfaces.md` after this change lands
- **THEN** every top-level section is a `## Step N` contract with Interfaces and Test assertions parts
- **AND** step attribution and exact assertions remain authoritative in those sections

### Requirement: Source artifacts remain authoritative and the overview stays faithful

The source artifacts SHALL remain the source of truth for the change. The overview SHALL reproduce normative requirements and scenarios faithfully to their source wording — it SHALL NOT silently reword, strengthen, weaken, or reinterpret normative content. The generator SHALL NOT modify any source artifact and SHALL NOT silently repair or invent source semantics to resolve gaps or contradictions.

#### Scenario: normative wording is preserved
- **WHEN** the overview presents a requirement or scenario from `specs/**/*.md`
- **THEN** the normative wording of that requirement or scenario matches the source
- **AND** the overview cites the source artifact the content is derived from

#### Scenario: generation does not modify sources
- **WHEN** the overview is generated or regenerated
- **THEN** none of `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, or `interfaces.md` is created, modified, or deleted

### Requirement: Contradictions and missing relationships are reported, not fabricated

The generator SHALL distinguish two classes of source problems:

- **Non-blocking gaps** — a relationship the overview must present is missing from the sources, or a mapping is ambiguous (for example a requirement with no anchored assertion, or a step with no testable assertion). These SHALL be recorded explicitly in the overview as gap reports naming the missing element and the source artifact involved, and the overview MAY still validate and be accepted.
- **Blocking source contradictions** — two source artifacts state conflicting facts about the change (for example the persisted `### File Manifest` in `design.md` diverges from the deterministic net fold over `tasks.md`, or two requirements contradict each other). These SHALL NOT be resolved or fabricated: the generator SHALL report the contradiction, naming both sources and their locations, and the transactional validation SHALL fail.

When validation fails on a blocking source contradiction, the failure payload SHALL carry the contradiction details: the stale record written to `change-overview.md` on a failed regeneration, or the blocking failure result returned on a failed initial generation, SHALL name the conflicting sources and their locations and state the one-line disagreement — the report is not a generic failure and is never silently swallowed.

#### Scenario: non-blocking gap is recorded in a valid overview
- **WHEN** the sources omit a relationship the overview must present (for example a requirement with no scenario, or an interface with no assertion)
- **THEN** the overview records the gap explicitly, naming the missing element and the source artifact involved
- **AND** the overview is still accepted if all other validation passes

#### Scenario: blocking contradiction fails validation with details
- **WHEN** two source artifacts state conflicting facts about the change (for example the persisted File Manifest diverges from the recomputed fold)
- **THEN** the generator does not pick either side silently and does not fabricate a resolution
- **AND** the transactional validation fails, and the failure payload names both sources and their locations and states the one-line disagreement

### Requirement: Overview is validated for completeness and consistency

At each generation, the generator SHALL validate the produced overview for completeness and consistency against its sources before the overview is considered generated: every section the overview must present is present, every statement in the overview traces to a source, and no statement in the overview contradicts a source. A generated overview that fails validation SHALL NOT be left as the change's overview.

Acceptance SHALL be transactional. The generator SHALL produce the complete new overview content, validate it in full against the sources, and only then write `change-overview.md` in a single atomic write. A failed generation or regeneration SHALL NOT leave partially written or partially validated output in the file.

#### Scenario: complete and consistent overview passes validation
- **WHEN** the generated overview presents all required sections and every statement traces to a source without contradiction
- **THEN** the overview is accepted as the change's review surface

#### Scenario: incomplete or inconsistent overview is not accepted
- **WHEN** validation finds a missing section, an untraceable statement, or a source contradiction
- **THEN** the generator reports the failure rather than accepting the defective overview as the change's overview
- **AND** the file is not left with partially validated content

### Requirement: Target State admits exactly the Architecture Snapshot and File Manifest subsections

The `## Target State` section of `change-overview.md` SHALL admit exactly two subsections, in order: `### Architecture Snapshot` followed by `### File Manifest` — the same two subsections admitted by the `design-target-state` capability in `design.md`. No other subsection SHALL be emitted inside `## Target State` in the overview, and the two subsections SHALL NOT be reordered. Both subsections SHALL follow the `None` behavior defined by `design-target-state`: `### Architecture Snapshot` emits `None — no planned public surfaces` with a one-line reason when no public surfaces are planned, and `### File Manifest` emits `None — no files affected` with a one-line reason when the net fold produces no lines. The two `None` sentinels SHALL NOT interact or suppress each other.

This requirement is the named "admitted-section rule" that `design-target-state` references for the overview's Target State subsection set.

#### Scenario: overview Target State contains exactly the two subsections in order
- **WHEN** `change-overview.md` is generated
- **THEN** `## Target State` contains exactly `### Architecture Snapshot` followed by `### File Manifest`
- **AND** no other subsection is emitted inside `## Target State`

#### Scenario: snapshot None sentinel follows design-target-state
- **WHEN** a change plans no public classes, interfaces, or methods
- **THEN** `### Architecture Snapshot` carries `None — no planned public surfaces` with a one-line reason
- **AND** `### File Manifest` beneath it still carries the full folded list (or its own sentinel) independently

#### Scenario: manifest None sentinel follows design-target-state
- **WHEN** the net fold over `tasks.md` produces no lines
- **THEN** `### File Manifest` carries `None — no files affected` with a one-line reason
- **AND** the sentinel is emitted regardless of the Architecture Snapshot's content

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

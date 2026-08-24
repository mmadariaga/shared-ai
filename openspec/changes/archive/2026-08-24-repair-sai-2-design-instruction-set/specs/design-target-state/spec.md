## MODIFIED Requirements

### Requirement: design.md opens with a Target State section
`openspec/changes/{name}/design.md` SHALL begin with a `## Target State` section, authored and persisted by the design phase as the authoritative source for the change's finished-shape snapshot. The active design step at `sai/commands/design/steps/design.md` SHALL require that the `## Target State` section is emitted in `design.md` before the other design sections, SHALL require that its File Manifest is folded deterministically from task entries, and SHALL require that `openspec/changes/{name}/interfaces.md` begins directly with its first `## Step N` section — no `## Target State` section and no snapshot or manifest subsection SHALL be emitted in `interfaces.md`. The `change-overview.md` projection SHALL read the authoritative snapshot details from `design.md`; it SHALL render them under an adapted approval-oriented `## Target Architecture` section rather than project `## Target State`, and SHALL NOT author or synthesize source snapshot facts independently. The overview renders an adapted ## Target Architecture rather than ## Target State.

`## Target State` SHALL present the finished shape the change converges on as **one concrete artifact** — not a per-step narrative and not a restatement of the change's motivation.

"Finished shape" SHALL be interpreted according to what the change produces:

- For code changes — the resulting payload, public signature, schema, file layout, or config shape as it will exist after the last step.
- For prose, instruction, or documentation changes — the resulting section and field structure of each document the change touches, as it will read after the last step.

The section SHALL be written so a reader who reads only `## Target State` knows what the repository looks like when the change is complete, without reading any `## Step N` section.

When a change genuinely produces no finished shape expressible under either interpretation, `## Target State` SHALL still be emitted with an explicit `None` and a one-line reason, matching the `None` provisions of `design-manual-verification` and `design-deferred-decisions`. Silent omission of the section SHALL NOT occur.

Directly beneath `## Target State`, `design.md` SHALL emit exactly the two sibling subsections required by the `Target State subsections remain exact in design.md only` requirement of the `change-overview-artifact` capability, in order: `### Architecture Snapshot` followed by `### File Manifest`. The `### Architecture Snapshot` subsection MAY contain the nested boundary blocks defined by the Architecture Snapshot requirements; those blocks are internal structure and SHALL NOT count as additional `###` siblings. No third `###` subsection SHALL be emitted inside `## Target State`. The `### File Manifest` subsection and its `None` sentinel are defined by the `File Manifest is a deterministic net fold over Files Affected` and `File Manifest has an independent None sentinel` requirements of this capability; the persisted manifest in `design.md` is authoritative, and the overview validates it against the recomputed fold per the `change-overview-artifact` capability's `Target State remains authoritative in design.md but is not projected into the overview` requirement.

#### Scenario: Target State is the first section of design.md
- **WHEN** the design phase completes for a change
- **THEN** `design.md`'s first section is `## Target State`
- **AND** every other design section appears after it, while `interfaces.md` contains no `## Target State` section

#### Scenario: Target State is one concrete artifact, not a step walkthrough
- **WHEN** a change modifies a public function signature and the schema it serializes
- **THEN** `## Target State` shows the final signature and the final schema as they will exist after the last step
- **AND** it does NOT describe the intermediate shapes each step produces

#### Scenario: prose change states its finished document structure
- **WHEN** a change modifies instruction or documentation files rather than code
- **THEN** `## Target State` shows the resulting section and field structure of each document the change touches, as it will read after the last step
- **AND** the section is NOT omitted on the grounds that no payload, signature, or schema is involved

#### Scenario: no expressible finished shape
- **WHEN** a change produces no finished shape under either interpretation
- **THEN** `## Target State` is emitted with `None` and a one-line reason
- **AND** the section is NOT silently omitted

#### Scenario: Target State is readable without the step sections
- **WHEN** a reader reads `## Target State` alone
- **THEN** the finished shape is fully determined from that section
- **AND** no `## Step N` section is required to interpret it

#### Scenario: nested snapshot structure does not add a Target State sibling
- **WHEN** `design.md` contains both Architecture Snapshot boundary blocks
- **THEN** `## Target State` contains exactly `### Architecture Snapshot` followed by `### File Manifest`
- **AND** the nested external-first/internal-second blocks do not become a third `###` subsection

#### Scenario: target-state-folds-task-entries
- **WHEN** the design worker generates Target State from task entries
- **THEN** the resulting section contains the authoritative snapshot and a deterministic manifest derived from those entries.


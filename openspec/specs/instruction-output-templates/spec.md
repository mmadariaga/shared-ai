# instruction-output-templates Specification

## Purpose

Provide six independently loadable SAI instruction output templates while preserving the existing generated-artifact contracts and phase behavior.

## Requirements

### Requirement: Dedicated template files

The instruction library SHALL contain six independently loadable Markdown output-template files next to their owning command instructions under `sai/commands/`, with these mappings: `sai/commands/implement/implementation-plan.template.md`, `sai/commands/review/review-report.template.md`, `sai/commands/security/security-report.template.md`, `sai/commands/performance/performance-report.template.md`, `sai/commands/accessibility/accessibility-report.template.md`, and `sai/commands/pr/pr-body.template.md`. The former `sai/instructions/_templates/` destinations SHALL be absent for these command-owned templates.

#### Scenario: all command templates are independently available

- **WHEN** an instruction phase loads its assigned template
- **THEN** the assigned neighboring `.template.md` file exists at the exact command-local destination and the other five template contracts remain independently addressable

### Requirement: Implementation plan contract is preserved

The implementation plan template SHALL preserve the current headings, placeholders, ordering, RED-to-GREEN execution contract, automated verification, human verification, deferred UI checks, STOP and COMMIT markers, no-TODO rule, and first-generation versus rerun behavior as carried by `sai/commands/implement/implementation-plan.template.md`.

#### Scenario: Implementation plan is generated from the extracted template
- **WHEN** the implementation phase creates `openspec/changes/{change-name}/implementation.md` for the first time
- **THEN** it uses `sai/commands/implement/implementation-plan.template.md` and produces the same required plan structure and verification gates as the former inline template

#### Scenario: Existing implementation plan is rerun
- **WHEN** the implementation phase is rerun after an implementation plan already exists
- **THEN** the extracted template does not cause the phase to regenerate or overwrite the existing plan

### Requirement: Audit report contracts are preserved independently

Each audit SHALL load only its command-owned template and retain its artifact path, shared severity vocabulary, identifiers, evidence requirements, and tally. Review SHALL use C/H/M/L/Q findings and close with `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Questions=<count>`. Its top-level sections SHALL be Summary, Security Surface Triage, Performance Surface Triage, Accessibility Surface Triage, Findings, and Coverage Notes, in that order. Summary SHALL record goal coverage and scope creep in one or two lines without repeating findings. Domain Alignment analysis SHALL remain, including decision contradictions as findings. Coverage Notes SHALL retain files reviewed/skipped, test inspection, and a `Resilience:` outcome even without surface, affected paths, and relevant idempotency and no-existing-pattern notes. Resilience findings SHALL remain in Findings under their unchanged rules. Review SHALL have no Next Steps, Domain Alignment Check, Resilience Surface Triage, or Mutation Analysis section or mutation counts/identifiers. All three audit recommendations SHALL remain under unchanged criteria.

Security, performance, and accessibility SHALL retain their mandatory Not Applicable sections with Justification, severity-prefixed identifiers, and phase-specific tallies; security SHALL retain conditional SCA, supply-chain, license, policy and evidence rules; performance SHALL retain evidence, metrics, hot-path, remediation and validation; accessibility SHALL retain WCAG/framework, location, impact, runtime and clean-coverage fields. Security's fenced template body SHALL stay unindented like its siblings. No other audit contract SHALL change.

#### Scenario: Audit phase loads only its own contract
- **WHEN** a phase drafts its report
- **THEN** it loads its dedicated template, not a shared or another phase's template

#### Scenario: Non-applicable audit sections are justified
- **WHEN** a surface or finding category does not apply
- **THEN** the report follows its existing omission or clean-coverage rule, including Not Applicable justification for whole-audit inapplicability rather than unrelated empty sections

#### Scenario: Security, performance, and accessibility contracts contain the mandatory Not Applicable section
- **WHEN** the three audit templates are read
- **THEN** each contains Not Applicable with Justification and unchanged remaining sections

#### Scenario: Security contract body is not indented relative to sibling contracts
- **WHEN** security and performance fenced templates are compared
- **THEN** security's body starts at the same column without extra indentation

#### Scenario: Review contract presents the shared severity sections and tally
- **WHEN** review Findings is read
- **THEN** its severity subsections and identifiers use Critical/High/Medium/Low/Questions and C1/H1/M1/L1/Q1
- **AND** findings count and closing tally use that vocabulary with no mutation roll-up

#### Scenario: Audit contracts carry identifiers and closing tallies
- **WHEN** security, performance, or accessibility finding bodies and closing sections are read
- **THEN** example headings lead with severity-prefixed identifiers
- **AND** each closes with its severity-subset tally

### Requirement: Pull request body contract is preserved

The pull request body template SHALL preserve its Summary, Goal, Design Decisions table, Audits checkboxes, and Out of Scope/Follow-ups sections, including optional-section omission, audit checkbox semantics, concise user-facing bullets, and faithful-to-diff constraints.

#### Scenario: Pull request body is assembled from the extracted template
- **WHEN** the PR phase drafts `openspec/changes/{change-name}/pr.md`
- **THEN** it produces the same body sections and audit-status semantics as the former inline `<output_template>` block

### Requirement: Parent instructions load templates by exact path

Each affected parent instruction SHALL load its template using the exact neighboring directive: `@sai/commands/implement/implementation-plan.template.md`, `@sai/commands/review/review-report.template.md`, `@sai/commands/security/security-report.template.md`, `@sai/commands/performance/performance-report.template.md`, `@sai/commands/accessibility/accessibility-report.template.md`, or `@sai/commands/pr/pr-body.template.md`. The surrounding instructions SHALL continue to control loading order, output saving, summaries, feedback, and stopping.

#### Scenario: parent instruction resolves its assigned neighbor

- **WHEN** a harness executes one of the six affected command instructions
- **THEN** it resolves exactly one matching `sai/commands/{name}/*.template.md` file and retains the phase-specific surrounding workflow rules

### Requirement: Extraction fidelity and projection verification are explicit

The fold SHALL verify that each command-local template contains the complete former template body byte-for-byte, excluding only removed wrapper marker lines, and that the manifest-driven Claude Code and opencode projections contain equivalent content at the folded destinations.

#### Scenario: extracted content remains equivalent

- **WHEN** each folded template is compared with its pre-fold source body
- **THEN** the comparison passes byte-for-byte apart from the intentional path and filename change

#### Scenario: both projections contain folded templates

- **WHEN** the manifest-driven projections are inspected for Claude Code and opencode
- **THEN** each supported harness contains all six command-local templates with content equivalent to the repository source

### Requirement: Existing installation projections remain consistent

The manifest SHALL project command-local instructions and templates and the root shared/canonical exceptions for Claude Code and opencode through explicit or recursive rules that produce no active `sai/instructions/` destinations. The former recursive instruction projection SHALL be replaced or retargeted without a compatibility duplicate.

#### Scenario: folded files are projected to both harnesses

- **WHEN** the manifest-driven installer expands the active inventory
- **THEN** each harness receives every command instruction, command-local template, shared overview instruction, and root ADR/DDR template at its folded `sai/` destination

### Requirement: Maintained installer and documentation references stay aligned

Maintained installer instructions and repository documentation for Claude Code and opencode SHALL describe the ADR template at `sai/commands/implement/adr-index.template.md` and its ownership by the `sai` root-class projection. Active documentation SHALL NOT direct maintainers to copy or expect `sai/compat/_templates/adr-index.md`. Historical archived change records are excluded from this requirement.

#### Scenario: Manual installer guidance uses the canonical source

- **WHEN** a maintainer follows the maintained installation guidance for any supported harness
- **THEN** the guidance SHALL project the ADR template through the `sai` root-class projection and SHALL contain no active instruction to copy the former `sai/instructions/` or compatibility template paths

#### Scenario: Repository documentation matches the manifest ownership

- **WHEN** a maintainer reads maintained repository documentation describing SAI source layout or installation projections
- **THEN** it SHALL identify `sai/commands/implement/adr-index.template.md` as the canonical source and SHALL not describe a separate compatibility projection for that template

### Requirement: No workflow behavior changes

The extraction SHALL not modify generated artifact names or locations, OpenSpec-owned skills, production code, configuration semantics, audit semantics, phase ordering, or cross-harness behavior. The only intended runtime difference SHALL be loading identical content from folded destinations.

#### Scenario: generated artifacts remain unchanged

- **WHEN** any affected phase completes after the fold
- **THEN** it writes the same artifact name under `openspec/changes/{change-name}/` with the same contract and validation expectations

### Requirement: Report template severity content changes preserve the pinned parity

Command-owned templates SHALL remain write-time authority. Matching schema scaffolds SHALL retain identical top-level heading sequences and header metadata labels, with descriptive comments delegating severity, finding shape, evidence, and tally to that authority. Both review templates SHALL use the simplified structure together; the scaffold SHALL describe the Summary and `Resilience:` coverage content without reproducing the normative finding format or tally. `test/report-template-authority.test.js` SHALL verify the maintained structure and authority pointer; the retired parity test SHALL NOT be restored.

#### Scenario: Scaffold mirrors the contract severity change
- **WHEN** review's command-owned report contract changes
- **THEN** the schema scaffold receives the matching structural change in the same change
- **AND** both retain the same top-level headings and metadata labels while severity remains delegated

#### Scenario: Parity test stays green after the edits
- **WHEN** all four template pairs are checked after review simplification
- **THEN** `node --test test/report-template-authority.test.js` passes without restoring the retired parity test

### Requirement: The DDR index template instance mirrors the ADR index template

The instruction library SHALL contain a DDR index template at `sai/commands/implement/ddr-index.template.md` — the project-agnostic cold-build skeleton for the DDR family, mirroring `sai/commands/implement/adr-index.template.md` instance for instance. The template SHALL carry the canonical section skeleton with the DDR per-index bindings: H1 `# DDR Index`, then the five `## ` sections in canonical order — `## Conventions`, `## By <domain unit>`, `## Cross-cutting categories`, `## DDRs that extend or correct prior ones`, `## Superseded DDRs (historical)`. The `## By <domain unit>` H2 SHALL carry the literal placeholder `<domain unit>` (never a concrete noun), and the `## By <domain unit>` and `## Cross-cutting categories` sections SHALL carry only empty placeholder skeletons with cold-build markers naming the DDR family. The template SHALL be referenced by `sai/commands/implement/steps/decision-record-index.md` by exact path as the DDR cold-build source, exactly as `sai/commands/implement/adr-index.template.md` is for the ADR family.

#### Scenario: DDR template structure matches the canonical section skeleton

- **WHEN** `sai/commands/implement/ddr-index.template.md` is consulted
- **THEN** it SHALL contain the canonical section skeleton: H1 `# DDR Index`, then the five `## ` sections in canonical order with the DDR type-specific headings `## DDRs that extend or correct prior ones` and `## Superseded DDRs (historical)`
- **THEN** the `## By <domain unit>` H2 SHALL carry the literal placeholder `<domain unit>`, never the concrete word "command"

#### Scenario: DDR template is project-agnostic

- **WHEN** `sai/commands/implement/ddr-index.template.md` is consulted
- **THEN** the `## By <domain unit>` and `## Cross-cutting categories` sections SHALL contain only empty placeholder skeletons with cold-build markers naming the DDR family
- **THEN** the template SHALL NOT list any specific `### /sai-N-*` subsection, any specific cross-cutting category name, or any DDR entry

#### Scenario: Implement.md references the DDR template by exact path

- **WHEN** a maintainer reads the DDR index-maintenance branch of `sai/commands/implement/steps/decision-record-index.md`
- **THEN** the branch instruction SHALL name `sai/commands/implement/ddr-index.template.md` by exact path as the DDR cold-build source rather than reproducing the index structure inline

### Requirement: The two index template instances stay in parity

The canonical ADR and DDR index template instances SHALL live at `sai/commands/implement/adr-index.template.md` and `sai/commands/implement/ddr-index.template.md` and SHALL remain skeleton-parity checked by the existing index-template test, which SHALL read those exact paths and retain family normalization and pinned skeleton assertions.

#### Scenario: root index parity holds

- **WHEN** the ADR/DDR index parity test runs
- **THEN** it reads the two root template paths and passes when their normalized skeletons match

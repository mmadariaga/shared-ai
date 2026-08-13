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

The implementation plan template SHALL preserve the current headings, placeholders, ordering, RED-to-GREEN execution contract, automated verification, human verification, deferred UI checks, STOP and COMMIT markers, no-TODO rule, and first-generation versus rerun behavior from the `<plan_template>` block in `sai/commands/implement/instructions.md`.

#### Scenario: Implementation plan is generated from the extracted template
- **WHEN** the implementation phase creates `openspec/changes/{change-name}/implementation.md` for the first time
- **THEN** it uses `sai/commands/implement/implementation-plan.template.md` and produces the same required plan structure and verification gates as the former inline template

#### Scenario: Existing implementation plan is rerun
- **WHEN** the implementation phase is rerun after an implementation plan already exists
- **THEN** the extracted template does not cause the phase to regenerate or overwrite the existing plan

### Requirement: Audit report contracts are preserved independently

The review, security, performance, and accessibility templates SHALL preserve their respective current headings, placeholders, severity rules, evidence requirements, optional-section rules, validation rules, and generated artifact paths, as amended by this change: the security, performance, and accessibility contracts SHALL additionally include a mandatory `## Not Applicable` section with a `**Justification:**` field, and the security contract SHALL render its fenced template body without leading indentation, matching its three sibling contracts. As further amended by this change, all four contracts SHALL present the shared severity vocabulary and severity-prefixed identifiers (`C1`/`H1`/`M1`/`L1`, with `Q1` in the review contract and `I1` in the performance and accessibility contracts) and SHALL close with a `Summary:` tally line listing every level of the phase's severity subset with its count. The review template SHALL retain mutation-analysis behavior, SHALL fold mutation severities into its counts as `High` (survived / pre-check-failed) and `Critical` (revert-failed), and SHALL close with `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Questions=<count>`; the security template SHALL close with `Summary: Critical=<count> High=<count> Medium=<count> Low=<count>` and SHALL retain conditional SCA, supply-chain, license, and policy sections and their evidence requirements; the performance template SHALL close with `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Informational=<count>` and SHALL retain evidence, metrics, hot-path, remediation, and validation fields; and the accessibility template SHALL close with `Summary: Critical=<count> High=<count> Medium=<count> Low=<count> Informational=<count>` and SHALL retain WCAG/framework fields, precise locations, user impact, runtime mode, and explicit clean-coverage reporting. The review template SHALL retain mutation-analysis and severity-total behavior; the security template SHALL retain conditional SCA, supply-chain, license, and policy sections and their evidence requirements; the performance template SHALL retain evidence, metrics, hot-path, remediation, and validation fields; and the accessibility template SHALL retain WCAG/framework fields, precise locations, user impact, runtime mode, and explicit clean-coverage reporting.

#### Scenario: Audit phase loads only its own contract
- **WHEN** a review, security, performance, or accessibility phase drafts its report
- **THEN** it loads the matching dedicated template and does not substitute a shared audit template or another audit phase's schema

#### Scenario: Non-applicable audit sections are justified
- **WHEN** an audit surface or optional finding category does not apply
- **THEN** the generated report follows that template's existing omission or explicit clean-coverage rule — filling the `## Not Applicable` justification when the whole audit does not apply — rather than rendering an unrelated or empty section

#### Scenario: Security, performance, and accessibility contracts contain the mandatory Not Applicable section
- **WHEN** `sai/commands/security/security-report.template.md`, `sai/commands/performance/performance-report.template.md`, and `sai/commands/accessibility/accessibility-report.template.md` are read
- **THEN** each contains a `## Not Applicable` section with a `**Justification:**` field, while its remaining sections stay unchanged

#### Scenario: Security contract body is not indented relative to sibling contracts
- **WHEN** `sai/commands/security/security-report.template.md` is compared with `sai/commands/performance/performance-report.template.md`
- **THEN** the security contract's fenced template body starts at the same column as the performance contract's, with no leading indentation beyond the fence content itself

#### Scenario: Review contract presents the shared severity sections and tally

- **WHEN** the review contract's Findings section is read
- **THEN** its severity subsections and example identifiers use `Critical`/`High`/`Medium`/`Low`/`Questions` with `C1`/`H1`/`M1`/`L1`/`Q1`
- **AND** its header findings-count line, mutation severity roll-up lines, and closing `Summary:` line use the shared vocabulary and the remapped mutation severities

#### Scenario: Audit contracts carry identifiers and closing tallies

- **WHEN** a security, performance, or accessibility contract's finding body and closing section are read
- **THEN** every example finding heading leads with its severity-prefixed identifier
- **AND** the contract closes with a `Summary:` line matching its severity subset

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

Maintained installer instructions and repository documentation for Claude Code and opencode SHALL describe the ADR template at `sai/adr-index.template.md` and its ownership by the `sai` root-class projection. Active documentation SHALL NOT direct maintainers to copy or expect `sai/compat/_templates/adr-index.md`. Historical archived change records are excluded from this requirement.

#### Scenario: Manual installer guidance uses the canonical source

- **WHEN** a maintainer follows the maintained installation guidance for any supported harness
- **THEN** the guidance SHALL project the ADR template through the `sai` root-class projection and SHALL contain no active instruction to copy the former `sai/instructions/` or compatibility template paths

#### Scenario: Repository documentation matches the manifest ownership

- **WHEN** a maintainer reads maintained repository documentation describing SAI source layout or installation projections
- **THEN** it SHALL identify `sai/adr-index.template.md` as the canonical source and SHALL not describe a separate compatibility projection for that template

### Requirement: No workflow behavior changes

The extraction SHALL not modify generated artifact names or locations, OpenSpec-owned skills, production code, configuration semantics, audit semantics, phase ordering, or cross-harness behavior. The only intended runtime difference SHALL be loading identical content from folded destinations.

#### Scenario: generated artifacts remain unchanged

- **WHEN** any affected phase completes after the fold
- **THEN** it writes the same artifact name under `openspec/changes/{change-name}/` with the same contract and validation expectations

### Requirement: Report template severity content changes preserve the pinned parity

When the four report contracts under `sai/commands/{accessibility,performance,review,security}/{artifact}-report.template.md` change their severity vocabulary, finding identifiers, or closing summary line, the matching schema scaffolds under `openspec/schemas/sai-workflow/templates/` SHALL receive the equivalent content changes in the same commit, keeping the per-pair skeleton parity pinned by `test/report-template-parity.test.js` intact: identical top-level `##` heading sequences, identical header metadata bold-label sequences, and, for the review pair only, the identical bolded field-label set under `## Mutation Analysis (Pass 11)`. The parity test SHALL pass after the four pairs are edited.

#### Scenario: Scaffold mirrors the contract severity change

- **WHEN** the review contract replaces its legacy three-level severity sections with the shared severity sections
- **THEN** the review scaffold receives the equivalent replacement in the same commit
- **AND** both families present the same top-level headings and header metadata labels

#### Scenario: Parity test stays green after the edits

- **WHEN** all four template pairs carry the shared severity content
- **THEN** `node --test test/report-template-parity.test.js` passes for all four pairs

### Requirement: The DDR index template instance mirrors the ADR index template

The instruction library SHALL contain a DDR index template at `sai/ddr-index.template.md` — the project-agnostic cold-build skeleton for the DDR family, mirroring `sai/adr-index.template.md` instance for instance. The template SHALL carry the canonical section skeleton with the DDR per-index bindings: H1 `# DDR Index`, then the five `## ` sections in canonical order — `## Conventions`, `## By <domain unit>`, `## Cross-cutting categories`, `## DDRs that extend or correct prior ones`, `## Superseded DDRs (historical)`. The `## By <domain unit>` H2 SHALL carry the literal placeholder `<domain unit>` (never a concrete noun), and the `## By <domain unit>` and `## Cross-cutting categories` sections SHALL carry only empty placeholder skeletons with cold-build markers naming the DDR family. The template SHALL be referenced by `sai/commands/implement/instructions.md` by exact path as the DDR cold-build source, exactly as `sai/adr-index.template.md` is for the ADR family.

#### Scenario: DDR template structure matches the canonical section skeleton

- **WHEN** `sai/ddr-index.template.md` is consulted
- **THEN** it SHALL contain the canonical section skeleton: H1 `# DDR Index`, then the five `## ` sections in canonical order with the DDR type-specific headings `## DDRs that extend or correct prior ones` and `## Superseded DDRs (historical)`
- **THEN** the `## By <domain unit>` H2 SHALL carry the literal placeholder `<domain unit>`, never the concrete word "command"

#### Scenario: DDR template is project-agnostic

- **WHEN** `sai/ddr-index.template.md` is consulted
- **THEN** the `## By <domain unit>` and `## Cross-cutting categories` sections SHALL contain only empty placeholder skeletons with cold-build markers naming the DDR family
- **THEN** the template SHALL NOT list any specific `### /sai-N-*` subsection, any specific cross-cutting category name, or any DDR entry

#### Scenario: Implement.md references the DDR template by exact path

- **WHEN** a maintainer reads `sai/commands/implement/instructions.md` Step 3's DDR index-maintenance branch
- **THEN** the branch instruction SHALL name `sai/ddr-index.template.md` by exact path as the DDR cold-build source rather than reproducing the index structure inline

### Requirement: The two index template instances stay in parity

The canonical ADR and DDR index template instances SHALL move to `sai/adr-index.template.md` and `sai/ddr-index.template.md` and SHALL remain skeleton-parity checked by the existing index-template test, which SHALL read those exact root paths and retain family normalization and pinned skeleton assertions.

#### Scenario: root index parity holds

- **WHEN** the ADR/DDR index parity test runs
- **THEN** it reads the two root template paths and passes when their normalized skeletons match

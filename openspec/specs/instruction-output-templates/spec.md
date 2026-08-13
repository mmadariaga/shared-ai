# instruction-output-templates Specification

## Purpose

Provide six independently loadable SAI instruction output templates while preserving the existing generated-artifact contracts and phase behavior.

## Requirements

### Requirement: Dedicated template files

The instruction library SHALL contain six independent Markdown template files co-located beside their owning command cards, with the following source-to-destination mappings:

- `sai/commands/implement/instructions.md` `<plan_template>` to `sai/commands/implement/implementation-plan.template.md`
- `sai/commands/review/instructions.md` `<output_template>` to `sai/commands/review/review-report.template.md`
- `sai/commands/security/instructions.md` `<output_template>` to `sai/commands/security/security-report.template.md`
- `sai/commands/performance/instructions.md` `<output_template>` to `sai/commands/performance/performance-report.template.md`
- `sai/commands/accessibility/instructions.md` `<output_template>` to `sai/commands/accessibility/accessibility-report.template.md`
- `sai/commands/pr/instructions.md` `<output_template>` to `sai/commands/pr/pr-body.template.md`

#### Scenario: All six templates are independently available
- **WHEN** an instruction phase loads its assigned template
- **THEN** the assigned file exists at the exact co-located path and the other five template contracts remain independently addressable

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

Each affected parent instruction SHALL load its template using the following literal harness-neutral directive at the former template-loading site:

- `sai/commands/implement/instructions.md`: `Fetch @sai/commands/implement/implementation-plan.template.md`
- `sai/commands/review/instructions.md`: `Fetch @sai/commands/review/review-report.template.md`
- `sai/commands/security/instructions.md`: `Fetch @sai/commands/security/security-report.template.md`
- `sai/commands/performance/instructions.md`: `Fetch @sai/commands/performance/performance-report.template.md`
- `sai/commands/accessibility/instructions.md`: `Fetch @sai/commands/accessibility/accessibility-report.template.md`
- `sai/commands/pr/instructions.md`: `Fetch @sai/commands/pr/pr-body.template.md`

Claude Code and opencode SHALL resolve these `Fetch @` directives through their existing harness-specific fetch mechanisms with equivalent loaded content. The surrounding instructions SHALL continue to control when the template is loaded, how its output is saved, what summaries are presented, how feedback is handled, and when the phase stops.

#### Scenario: Parent instruction resolves its assigned template
- **WHEN** a harness executes one of the six affected parent instructions
- **THEN** the instruction resolves exactly one matching `sai/commands/{phase}/{artifact}.template.md` path and retains the phase-specific surrounding workflow rules

#### Scenario: No inline contract remains in the parent
- **WHEN** a reviewer inspects the six affected parent instructions
- **THEN** the former inline template body is absent, the matching literal `Fetch @sai/commands/{phase}/{artifact}.template.md` reference remains in that loading position, and no inline template body is substituted there

#### Scenario: No dangling template markers remain
- **WHEN** a reviewer searches all six affected parent instructions after extraction
- **THEN** no `<plan_template>` or `<output_template>` marker remains anywhere, including references outside the former inline body, and every former template-derived reference uses the mapped exact path or the stable name of that dedicated template

### Requirement: Extraction fidelity and projection verification are explicit

The extraction change SHALL verify that each dedicated file contains the complete template body formerly enclosed by its parent markers, with no omitted, reordered, normalized, or newly authored template content. It SHALL also verify that all six dedicated files are present in the managed `sai/commands/` projection for Claude Code and opencode and that each projected file is content-equivalent to its source file.

#### Scenario: Extracted content is equivalent to the former inline body
- **WHEN** the six extracted files are compared with the pre-extraction contents between their corresponding marker pairs
- **THEN** each comparison passes byte-for-byte for the template body, excluding only the removed wrapper marker lines

#### Scenario: All harness projections contain the extracted files
- **WHEN** the manifest-driven projections are inspected for Claude Code and opencode
- **THEN** each harness contains all six expected `.template.md` files and every file matches its repository source content

### Requirement: Existing installation projections remain consistent

The recursive `sai-commands` projection in `sai/install-manifest.json` SHALL continue to install every Markdown file beneath `sai/commands/`, including the six co-located report/plan `.template.md` files. The active project-agnostic index templates `sai/adr-index.template.md` and `sai/ddr-index.template.md` install through their own `sai` root-class projections. The former `sai-instructions` recursive projection and the retired `sai/instructions/_templates/` destinations are covered by retirement records only. There SHALL be no separate explicit compatibility projection for the former ADR template destination; `retired-adr-index-template` is the retirement record for cleanup evidence only.

#### Scenario: New templates are projected to all supported harnesses

- **WHEN** the manifest-driven installer projects the `sai-commands` source tree
- **THEN** the six phase output templates are installed through the recursive `sai-commands` rule and the two index templates `sai/adr-index.template.md` and `sai/ddr-index.template.md` install through their `sai` root-class projections, for each of Claude Code and opencode

#### Scenario: ADR template uses its root-class projection

- **WHEN** installation or projection logic handles `sai/adr-index.template.md`
- **THEN** each supported harness receives it at `adr-index.template.md` under the `sai` destination root, with source-equivalent content, and no active projection targets the former `sai/instructions/_templates/adr-index.md` or `sai/compat/_templates/adr-index.md` destination

#### Scenario: DDR template uses its root-class projection

- **WHEN** installation or projection logic handles `sai/ddr-index.template.md`
- **THEN** each supported harness receives it at `ddr-index.template.md` under the `sai` destination root, with source-equivalent content, and no active projection targets the former `sai/instructions/_templates/ddr-index.md` destination

### Requirement: Maintained installer and documentation references stay aligned

Maintained installer instructions and repository documentation for Claude Code and opencode SHALL describe the ADR template at `sai/adr-index.template.md` and its ownership by the `sai` root-class projection. Active documentation SHALL NOT direct maintainers to copy or expect `sai/compat/_templates/adr-index.md`. Historical archived change records are excluded from this requirement.

#### Scenario: Manual installer guidance uses the canonical source

- **WHEN** a maintainer follows the maintained installation guidance for any supported harness
- **THEN** the guidance SHALL project the ADR template through the `sai` root-class projection and SHALL contain no active instruction to copy the former `sai/instructions/` or compatibility template paths

#### Scenario: Repository documentation matches the manifest ownership

- **WHEN** a maintainer reads maintained repository documentation describing SAI source layout or installation projections
- **THEN** it SHALL identify `sai/adr-index.template.md` as the canonical source and SHALL not describe a separate compatibility projection for that template

### Requirement: No workflow behavior changes

The extraction SHALL not modify generated artifact names or locations, OpenSpec-owned skills, production code, configuration, audit semantics, phase ordering, or cross-harness behavior. The only intended runtime difference SHALL be loading identical template content from dedicated files instead of inline parent-instruction content. The active project-agnostic ADR template source SHALL be `sai/adr-index.template.md`; the former compatibility destination is represented only by the `retired-adr-index-template` retirement record.

#### Scenario: Generated artifacts remain unchanged
- **WHEN** any of the six phases completes after the extraction
- **THEN** it writes the same artifact name under `openspec/changes/{change-name}/` with the same contract and validation expectations as before

#### Scenario: Harness behavior remains equivalent
- **WHEN** Claude Code and opencode execute the affected instructions from their installed projections
- **THEN** each harness receives equivalent template content and phase behavior

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

The ADR and DDR index template instances SHALL stay in skeleton parity, enforced by an automated test at `test/index-template-parity.test.js` following the `test/report-template-parity.test.js` precedent. The test SHALL read `sai/adr-index.template.md` and `sai/ddr-index.template.md`, normalize the family vocabulary token on both sides (ADR ↔ DDR, ADRs ↔ DDRs, adr ↔ ddr, `docs/adr/` ↔ `docs/ddr/`), and assert:

- identical top-level heading sequence — the H1 and the five `## ` headings in canonical order (family-normalized);
- identical `## Conventions` bullet sequence (family-normalized);
- identical pinned skeleton forms: the literal `<domain unit>` placeholder in the `## By <domain unit>` H2, the entry-line form `- [NNNN — {Title}](./NNNN-slug.md)`, the correction-table header `| <Family> | Action | Over |`, and the supersede-note form `— *Superseded by [NNNN](./NNNN-slug.md)*`.

The test SHALL fail when a skeleton element appears on one side without the other, identifying the divergent element, and SHALL pass together with the rest of `node --test`.

#### Scenario: Parity holds and the test passes

- **WHEN** the two index template instances are in parity and the test suite runs
- **THEN** `test/index-template-parity.test.js` passes together with the rest of `node --test`

#### Scenario: Drift on one side fails the test

- **WHEN** a section heading is added to `adr-index.template.md` without the corresponding heading in `ddr-index.template.md` (or vice versa)
- **THEN** `test/index-template-parity.test.js` fails and identifies the divergent instance and element

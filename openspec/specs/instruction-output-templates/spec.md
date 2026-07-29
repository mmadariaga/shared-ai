# instruction-output-templates Specification

## Purpose

Provide six independently loadable SAI instruction output templates while preserving the existing generated-artifact contracts and phase behavior.

## Requirements

### Requirement: Dedicated template files

The instruction library SHALL contain six independent Markdown template files under `sai/instructions/_templates/`, with the following source-to-destination mappings:

- `sai/instructions/implement.md` `<plan_template>` to `sai/instructions/_templates/implementation-plan.md`
- `sai/instructions/review.md` `<output_template>` to `sai/instructions/_templates/review-report.md`
- `sai/instructions/security.md` `<output_template>` to `sai/instructions/_templates/security-report.md`
- `sai/instructions/performance.md` `<output_template>` to `sai/instructions/_templates/performance-report.md`
- `sai/instructions/accessibility.md` `<output_template>` to `sai/instructions/_templates/accessibility-report.md`
- `sai/instructions/pr.md` `<output_template>` to `sai/instructions/_templates/pr-body.md`

#### Scenario: All six templates are independently available
- **WHEN** an instruction phase loads its assigned template
- **THEN** the assigned file exists at the exact destination path and the other five template contracts remain independently addressable

### Requirement: Implementation plan contract is preserved

The implementation plan template SHALL preserve the current headings, placeholders, ordering, RED-to-GREEN execution contract, automated verification, human verification, deferred UI checks, STOP and COMMIT markers, no-TODO rule, and first-generation versus rerun behavior from the `<plan_template>` block in `sai/instructions/implement.md`.

#### Scenario: Implementation plan is generated from the extracted template
- **WHEN** the implementation phase creates `openspec/changes/{change-name}/implementation.md` for the first time
- **THEN** it uses `sai/instructions/_templates/implementation-plan.md` and produces the same required plan structure and verification gates as the former inline template

#### Scenario: Existing implementation plan is rerun
- **WHEN** the implementation phase is rerun after an implementation plan already exists
- **THEN** the extracted template does not cause the phase to regenerate or overwrite the existing plan

### Requirement: Audit report contracts are preserved independently

The review, security, performance, and accessibility templates SHALL preserve their respective current headings, placeholders, severity rules, evidence requirements, optional-section rules, validation rules, and generated artifact paths. The review template SHALL retain mutation-analysis and severity-total behavior; the security template SHALL retain conditional SCA, supply-chain, license, and policy sections and their evidence requirements; the performance template SHALL retain evidence, metrics, hot-path, remediation, and validation fields; and the accessibility template SHALL retain WCAG/framework fields, precise locations, user impact, runtime mode, and explicit clean-coverage reporting.

#### Scenario: Audit phase loads only its own contract
- **WHEN** a review, security, performance, or accessibility phase drafts its report
- **THEN** it loads the matching dedicated template and does not substitute a shared audit template or another audit phase's schema

#### Scenario: Non-applicable audit sections are omitted
- **WHEN** an audit surface or optional finding category does not apply
- **THEN** the generated report follows that template's existing omission or explicit clean-coverage rule rather than rendering an unrelated or empty section

### Requirement: Pull request body contract is preserved

The pull request body template SHALL preserve its Summary, Goal, Design Decisions table, Audits checkboxes, and Out of Scope/Follow-ups sections, including optional-section omission, audit checkbox semantics, concise user-facing bullets, and faithful-to-diff constraints.

#### Scenario: Pull request body is assembled from the extracted template
- **WHEN** the PR phase drafts `openspec/changes/{change-name}/pr.md`
- **THEN** it produces the same body sections and audit-status semantics as the former inline `<output_template>` block

### Requirement: Parent instructions load templates by exact path

Each affected parent instruction SHALL load its template using the following literal harness-neutral directive at the former template-loading site:

- `sai/instructions/implement.md`: `Fetch @sai/instructions/_templates/implementation-plan.md`
- `sai/instructions/review.md`: `Fetch @sai/instructions/_templates/review-report.md`
- `sai/instructions/security.md`: `Fetch @sai/instructions/_templates/security-report.md`
- `sai/instructions/performance.md`: `Fetch @sai/instructions/_templates/performance-report.md`
- `sai/instructions/accessibility.md`: `Fetch @sai/instructions/_templates/accessibility-report.md`
- `sai/instructions/pr.md`: `Fetch @sai/instructions/_templates/pr-body.md`

Claude Code, opencode, and GitHub Copilot SHALL resolve these `Fetch @` directives through their existing harness-specific fetch mechanisms with equivalent loaded content. The surrounding instructions SHALL continue to control when the template is loaded, how its output is saved, what summaries are presented, how feedback is handled, and when the phase stops.

#### Scenario: Parent instruction resolves its assigned template
- **WHEN** a harness executes one of the six affected parent instructions
- **THEN** the instruction resolves exactly one matching `sai/instructions/_templates/*.md` path and retains the phase-specific surrounding workflow rules

#### Scenario: No inline contract remains in the parent
- **WHEN** a reviewer inspects the six affected parent instructions
- **THEN** the former inline template body is absent, the matching literal `Fetch @sai/instructions/_templates/*.md` reference remains in that loading position, and no inline template body is substituted there

#### Scenario: No dangling template markers remain
- **WHEN** a reviewer searches all six affected parent instructions after extraction
- **THEN** no `<plan_template>` or `<output_template>` marker remains anywhere, including references outside the former inline body, and every former template-derived reference uses the mapped exact path or the stable name of that dedicated template

### Requirement: Extraction fidelity and projection verification are explicit

The extraction change SHALL verify that each dedicated file contains the complete template body formerly enclosed by its parent markers, with no omitted, reordered, normalized, or newly authored template content. It SHALL also verify that all six dedicated files are present in the managed `sai/instructions/_templates/` projection for Claude Code, opencode, and GitHub Copilot and that each projected file is content-equivalent to its source file.

#### Scenario: Extracted content is equivalent to the former inline body
- **WHEN** the six extracted files are compared with the pre-extraction contents between their corresponding marker pairs
- **THEN** each comparison passes byte-for-byte for the template body, excluding only the removed wrapper marker lines

#### Scenario: All harness projections contain the extracted files
- **WHEN** the manifest-driven projections are inspected for Claude Code, opencode, and GitHub Copilot
- **THEN** each harness contains all six expected `_templates/*.md` files and every file matches its repository source content

### Requirement: Existing installation projections remain consistent

The existing recursive `sai-instructions` projection in `sai/install-manifest.json` SHALL continue to install Markdown files beneath `sai/instructions/_templates/` to Claude Code, opencode, and GitHub Copilot without requiring a new projection rule. The explicit projection for `sai/compat/_templates/adr-index.md` SHALL remain separate and unchanged.

#### Scenario: New templates are projected to all supported harnesses
- **WHEN** the manifest-driven installer projects the `sai-instructions` source tree
- **THEN** all six files under `sai/instructions/_templates/` are installed through the existing recursive rule for each of Claude Code, opencode, and GitHub Copilot

#### Scenario: Compatibility template projection is not merged
- **WHEN** installation or projection logic handles `sai/compat/_templates/adr-index.md`
- **THEN** it continues to use its existing explicit compatibility projection rather than the instruction-template directory

### Requirement: No workflow behavior changes

The extraction SHALL not modify generated artifact names or locations, OpenSpec-owned skills, production code, configuration, audit semantics, phase ordering, or cross-harness behavior. The only intended runtime difference SHALL be loading identical template content from dedicated files instead of inline parent-instruction content. The pre-existing `openspec/specs/adr-index-maintenance/spec.md` reference to `sai/instructions/_templates/adr-index.md` SHALL remain outside this change; the active `sai/compat/_templates/adr-index.md` source and its explicit manifest projection SHALL remain unchanged.

#### Scenario: Generated artifacts remain unchanged
- **WHEN** any of the six phases completes after the extraction
- **THEN** it writes the same artifact name under `openspec/changes/{change-name}/` with the same contract and validation expectations as before

#### Scenario: Harness behavior remains equivalent
- **WHEN** Claude Code, opencode, and GitHub Copilot execute the affected instructions from their installed projections
- **THEN** each harness receives equivalent template content and phase behavior

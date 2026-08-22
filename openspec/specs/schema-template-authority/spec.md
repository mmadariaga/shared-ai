# schema-template-authority Specification

## Purpose
TBD: define the authority-pointer relationship between schema scaffolds and command-owned write-time contracts.

## Requirements

### Requirement: descriptive-report-scaffolds

The schema-side `review.md`, `security.md`, `performance.md`, and `accessibility.md` templates SHALL remain discoverable descriptive scaffolds rather than duplicated write-time contracts. Each scaffold SHALL retain its report title and placeholders, current header metadata labels, and the complete existing top-level `##` heading sequence. Each section SHALL have one one-line HTML comment describing its purpose, and the scaffold SHALL contain a descriptive `Summary:` tally-line comment immediately before its final `Write-time authority` pointer. Each report authority pointer comment SHALL name the delegated `severity vocabulary`, `evidence rules`, `finding shape`, and `tally line` alongside its `sai/` path, without restating those rules in the scaffold body or enumerating severity vocabulary or normative finding/evidence fields below the header metadata.

#### Scenario: report scaffold preserves discoverable structure

- **WHEN** a maintainer opens one of the four schema-side report templates
- **THEN** the report title, header metadata labels, placeholders, and all existing `##` headings remain visible in their current order
- **AND** each section is represented by one one-line HTML comment rather than duplicated write-time fields

#### Scenario: report scaffold does not become a second contract

- **WHEN** the body below the first top-level section heading is inspected
- **THEN** it contains no bold `**Field:**` labels, severity vocabulary, or normative finding/evidence requirements
- **AND** the descriptive tally comment immediately precedes the final authority pointer and tells the reader to use the applicable command-owned tally without restating its levels

### Requirement: canonical-implementation-scaffold

The schema-side `implementation.md` template SHALL be a descriptive skeleton of the real fenced payload in `sai/commands/implement/implementation-plan.template.md`. It SHALL preserve the `# {FEATURE_NAME}` title shape, `## Goal`, `## Prerequisites`, and `### Step-by-Step Instructions` headings, followed by a representative `#### Step 1: {Action}`, `##### RED phase`, conditional `##### GREEN phase` for a testable step, `##### Step 1 Verification Checklist`, and `#### Step 1 STOP & COMMIT` sequence. The skeleton SHALL describe the non-testable/deferred step variants represented by the authority contract without inventing a `Source` / `Tasks ref` / `Design ref` metadata block or requiring RED/GREEN for every step. Its final authority pointer SHALL name `sai/commands/implement/implementation-plan.template.md`. The implementation authority pointer comment SHALL name these delegated areas using exactly the literals `planning`, `conditional RED/GREEN`, `verification`, `STOP & COMMIT`, and `commit-authorization checklist` alongside its `sai/` path. Any retained STOP & COMMIT description SHALL point to `sai/commands/apply/invocation.md` and name both the per-Step STOP & COMMIT gate and the terminal documentation commit gate for the commit-authorization checklist. It SHALL not retain the dissolved `sai/commands/apply/instructions.md` reference.

#### Scenario: implementation scaffold mirrors the real plan shape

- **WHEN** a maintainer opens the schema-side implementation template
- **THEN** the title, `## Goal`, `## Prerequisites`, and `### Step-by-Step Instructions` headings are visible
- **AND** the representative Step 1 sequence exposes RED, conditional GREEN, its verification checklist, and STOP & COMMIT
- **AND** the scaffold distinguishes testable steps from non-testable or deferred step variants

#### Scenario: implementation scaffold has no invented metadata

- **WHEN** the implementation scaffold's header is compared with the authority contract
- **THEN** it does not introduce `Source`, `Tasks ref`, or `Design ref` metadata fields
- **AND** its final authority comment points to `sai/commands/implement/implementation-plan.template.md`
- **AND** any commit-authorization reference names `sai/commands/apply/invocation.md`, the per-Step STOP & COMMIT gate, and the terminal documentation commit gate
- **AND** it does not point to `sai/commands/apply/instructions.md`

### Requirement: schema-instruction-authority-pointers

The five matching artifact `instruction` blocks in `schema.yaml` SHALL be informative authority pointers using the exact formula `Fetch and follow <sai path> exactly. This instruction is an informative reference only; it does not restate the <X> contract.` The exact report sentences SHALL use `review report`, `security report`, `performance report`, and `accessibility report` for `<X>` respectively; the implementation sentence SHALL use `implementation plan`. The mappings SHALL be review → `sai/commands/review/review-report.template.md`, security → `sai/commands/security/security-report.template.md`, performance → `sai/commands/performance/performance-report.template.md`, accessibility → `sai/commands/accessibility/accessibility-report.template.md`, and implementation → `sai/commands/implement/implementation-plan.template.md`. The schema graph keys `generates`, `requires`, `description`, `apply.requires`, and `apply.tracks`, plus the separate top-level `apply.instruction` block, SHALL remain byte-for-byte unchanged; only the five artifact instruction blocks named above change.

#### Scenario: report instruction points to its matching contract

- **WHEN** OpenSpec resolves the review, security, performance, or accessibility artifact instruction
- **THEN** its instruction is the two-sentence informative pointer to the matching `sai/commands/**` report contract
- **AND** the instruction contains no copied report fields, severity levels, or validation rules

#### Scenario: implementation instruction points to the current implementation owner

- **WHEN** OpenSpec resolves the implementation artifact instruction
- **THEN** it says to fetch and follow `sai/commands/implement/implementation-plan.template.md` exactly and identifies the text as informative only
- **AND** it does not mention the dissolved apply instruction path

### Requirement: authority-pointer-verification

The replacement authority-pointer test SHALL inspect all five schema templates, assert the exact mappings review → `sai/commands/review/review-report.template.md`, security → `sai/commands/security/security-report.template.md`, performance → `sai/commands/performance/performance-report.template.md`, accessibility → `sai/commands/accessibility/accessibility-report.template.md`, and implementation → `sai/commands/implement/implementation-plan.template.md`, assert that each final `Write-time authority` HTML comment names a path beginning under `sai/`, assert that every referenced path exists, assert the exact delegated-area wording for each pointer comment, and for implementation specifically assert exactly `planning`, `conditional RED/GREEN`, `verification`, `STOP & COMMIT`, and `commit-authorization checklist`. It SHALL assert the exact two-sentence instruction strings for the five artifact-level `instruction` blocks, and assert byte-for-byte preservation of the five named graph-key values and the separate top-level `apply.instruction` block. It SHALL extract each command-owned contract's payload from its outer fenced markdown block using matching opening/closing fence indentation, mirroring the retired test's fence extraction behavior, and compare the top-level `##` heading sequence of each schema scaffold with the sequence in that fenced payload. This applies equally to implementation: its schema scaffold SHALL correspond to the authority payload's `## Goal` and `## Prerequisites` headings, while its nested step headings SHALL preserve the real conditional RED/GREEN and verification shape. It SHALL also assert that no `**...:**` field label appears below the scaffold's header metadata. For this test, header metadata is the contiguous text before the first line beginning with `## `, and a body field label is a line matching an optional list marker followed by `**`, one or more non-newline characters, `**:`, with no permitted exceptions.

#### Scenario: authority pointers are resolvable and scoped

- **WHEN** `node --test test/report-template-authority.test.js` runs
- **THEN** every schema template has one final authority pointer under `sai/`
- **AND** each pointer resolves to an existing repository file

#### Scenario: report heading drift is detected without content parity

- **WHEN** a report scaffold's `##` heading order differs from its referenced command contract
- **THEN** the authority-pointer test fails and identifies the report pair
- **AND** placeholder syntax and guidance depth remain outside the assertion

#### Scenario: duplicated body fields are detected

- **WHEN** a bold `**Field:**` label is added below a schema scaffold's header metadata
- **THEN** the authority-pointer test fails
- **AND** the command-owned contract remains the only place that defines the field

### Requirement: historical-and-copy-boundaries

The change SHALL preserve the recursive schema-copy behavior implemented by `bin/setup.js`, SHALL not modify any file under `sai/`, existing rendered `openspec/changes/**` or archive artifacts, `openspec/specs/schema-copy/spec.md`, or design-phase artifacts, and SHALL preserve the contents of ADR 0106b. It SHALL add `docs/adr/0162b-schema-report-templates-point-to-write-time-authority.md` with an explicit `Supersedes` reference to ADR 0106b, update exactly the five `docs/adr/0000-INDEX.md` references to the report-template parity ADR to point to ADR 0162b, verify that `docs/adr/0106a-run-path-baseline-predicate.md` remains untouched, and update the permitted root glossary terminology from the retired parity term to `Schema Template Authority`.

#### Scenario: setup continues to copy the schema tree

- **WHEN** setup copies the package schema directory into a project
- **THEN** it continues to recursively overwrite the destination files using the existing `bin/setup.js` behavior
- **AND** no setup code or schema-copy specification is changed by this change

#### Scenario: ADR history and rendered artifacts remain bounded

- **WHEN** the change is reviewed by path
- **THEN** `docs/adr/0162b-schema-report-templates-point-to-write-time-authority.md` exists and explicitly supersedes ADR 0106b, ADR 0106b's content and the run-path baseline ADR are unchanged, exactly five index references are redirected to ADR 0162b, and no existing rendered change or archive artifact is modified
- **AND** no design.md, tasks.md, or interfaces.md is generated for this spec phase

#### Scenario: consumer copies require no migration marker

- **WHEN** a consumer project does not rerun setup after this change
- **THEN** its already-copied schema templates remain the full pre-change templates
- **AND** no migration or version marker is written, which is an accepted compatibility outcome

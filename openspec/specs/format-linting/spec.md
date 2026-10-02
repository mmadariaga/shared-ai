# format-linting Specification

## Purpose
TBD - created by archiving change deterministic-format-linter. Update Purpose after archive.

## Requirements

### Requirement: Deterministic format validation with selectable sub-checks

The repository SHALL provide a single runnable validator at `sai/tools/lint.js` that checks conformance of files and text to the artifact-format policies defined in `sai/policies/*.md`. The validator MUST support selectable sub-checks, each validating one policy's format rules deterministically without inference. Each check SHALL examine files, accept text input, or both as appropriate to the policy, and report findings using the same exit-code and output contract as `sai/tools/check-delta-headers.js`: exit 0 when conformant, exit 1 when findings are reported line-by-line on stdout, exit 2 on usage or I/O error.

#### Scenario: commit-rules check validates Conventional Commits format
- **WHEN** the commit-rules check is invoked on a commit message file
- **THEN** it validates subject length (≤50 chars), Conventional Commits type/scope format, absence of trailing period, blank line before body, and body line wrapping (≤72 chars)
- **AND** exit 0 when all checks pass, exit 1 with per-violation line reports when failures are found

#### Scenario: glossary-format check validates GLOSSARY.md structure
- **WHEN** the glossary-format check is invoked on a GLOSSARY.md file
- **THEN** it validates H1 heading presence, Language section, Relationships section, term definitions with quotes, and *Avoid* lines for each term
- **AND** exit 0 when all checks pass, exit 1 with findings when structure is violated

#### Scenario: ready-to-propose check validates crystallized block structure
- **WHEN** the ready-to-propose check is invoked on a block containing `## Ready to Propose`
- **THEN** it validates the block with the `strict` profile of `sai/tools/ready-to-propose.js`: presence and order of every canonical field (Change name, What, Why, Capabilities in scope, Research Leads, Decisions & Rationale, Alternatives Considered, Trade-offs Accepted, Model / Re-framings, Key constraints, Terms, Edge Cases, Implementation Details, Out of scope Implementation Details, optional Request Additional Notes, Overview language)
- **AND** exit 0 when the block conforms, exit 1 with findings when fields are missing, misordered, or malformed

#### Scenario: artifact-review check validates finding format and severity
- **WHEN** the artifact-review check is invoked on artifact review findings
- **THEN** it validates each finding has exactly 5 fields (Identifier, Severity, Artifact location, Issue, Recommended correction), severity is exactly High/Medium/Low, identifier format is single letter (H/M/L) followed by number, and closing Summary line format is `Summary: High=<count> Medium=<count> Low=<count>`
- **AND** exit 0 when all findings conform, exit 1 with per-violation reports when format is violated

#### Scenario: sai-learnings-format check validates SAI_LEARNINGS.md structure
- **WHEN** the sai-learnings-format check is invoked on SAI_LEARNINGS.md
- **THEN** it validates H1 heading presence, exactly 4 sections in order (Stack, Conventions, Avoid, Test Command), section content rules, and Test Command single-or-sentinel rule
- **AND** exit 0 when structure is correct, exit 1 with findings when sections are missing, misordered, or improperly formatted

#### Scenario: step-contract check validates interfaces.md Step sections
- **WHEN** the step-contract check is invoked on interfaces.md containing Step sections
- **THEN** it validates `## Step N:` heading format, presence of `**Interfaces**:` and `**Test assertions**:` fields in each step, or the sentinel `None — no step contracts` as sole content
- **AND** exit 0 when all steps conform, exit 1 with findings when required fields are missing

#### Scenario: pr-title-rules check validates pull request title format
- **WHEN** the pr-title-rules check is invoked on a pull request title text
- **THEN** it validates title length (≤70 chars), Conventional Commits prefix presence, absence of emoji characters, and absence of trailing period
- **AND** exit 0 when all checks pass, exit 1 with findings when format violations are detected

### Requirement: Checks are independent and do not mutate input

Each sub-check SHALL be read-only. Invocation of any check SHALL NOT modify the input file, create additional files, or trigger any worker lifecycle. The tool is a validator only, and triggering the validator into any build, test, or deployment pipeline is a separate concern beyond this capability.

#### Scenario: validator reports findings without side effects
- **WHEN** a check is invoked on a file
- **THEN** the file and repository remain unchanged after the check completes
- **AND** the check returns only its exit code and stdout report

#### Scenario: todo-structure.md is deliberately excluded
- **WHEN** considering which policies should have checks
- **THEN** `sai/policies/todo-structure.md` deliberately has no check because it defines coordinator-owned rendering behavior and state semantics rather than statically validatable file-format rules
- **AND** the policy file carries a cross-reference note explaining this exclusion

### Requirement: Ready-to-propose check accepts the optional Request Additional Notes field

The `lint.js ready-to-propose` check SHALL accept a `Ready to Propose` block both with and without an optional `**Request Additional Notes**` field between `**Out of scope Implementation Details**` and `**Overview language**`. The field SHALL NOT break the required-section order check.

#### Scenario: Block with the notes field passes

- **WHEN** the ready-to-propose check runs on a block whose `**Request Additional Notes**` field, holding paragraph and bullet content, sits between `**Out of scope Implementation Details**` and `**Overview language**`
- **THEN** the check exits 0 and reports that the check passed

### Requirement: Ready-to-propose check requires the Out of scope Implementation Details section

The `lint.js ready-to-propose` check SHALL treat `**Out of scope Implementation Details**` as a required section that follows `**Implementation Details**` in the required-section order.

#### Scenario: Block without the section fails

- **WHEN** the ready-to-propose check runs on a block that has every other required section but no `**Out of scope Implementation Details**`
- **THEN** the check exits non-zero and its report names `Out of scope Implementation Details`

#### Scenario: Block with the section as None passes

- **WHEN** the ready-to-propose check runs on a block whose `**Out of scope Implementation Details**` is exactly `- None` after `**Implementation Details**`
- **THEN** the check exits 0

### Requirement: Ready-to-propose check delegates to the detector strict profile

The `lint.js ready-to-propose` check SHALL obtain its verdict from the `strict` profile of `sai/tools/ready-to-propose.js` and MUST NOT carry a section list of its own. It SHALL report each detector violation as a lint finding with its line, problem, and detail.

#### Scenario: Missing Change name fails through delegation
- **WHEN** the ready-to-propose check runs on a block that has every other canonical field but no `**Change name**`
- **THEN** the check exits 1 and its report carries `MISSING_SECTION` naming `Change name`

#### Scenario: lint.js holds no section list
- **WHEN** the `sai/tools/lint.js` source is read
- **THEN** it requires `./ready-to-propose.js` and contains no list of block section labels

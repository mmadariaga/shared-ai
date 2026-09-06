# format-linting Specification

## Purpose
TBD - created by archiving change deterministic-format-linter. Update Purpose after archive.
## Requirements
### Requirement: Deterministic format validation with selectable sub-checks

The repository SHALL provide a single runnable validator at `sai/tools/lint.js` that checks conformance of files to the artifact-format policies defined in `sai/policies/*.md`. The validator MUST support selectable sub-checks, each validating one policy's format rules deterministically without inference. Each check SHALL examine files and report findings using the same exit-code and output contract as `sai/tools/check-delta-headers.js`: exit 0 when conformant, exit 1 when findings are reported line-by-line on stdout, exit 2 on usage or I/O error.

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
- **THEN** it validates presence of required sections and their ordering (Capabilities in scope, Research Leads, Decisions & Rationale, Alternatives Considered, Trade-offs Accepted, Model / Re-framings, Key constraints, Edge Cases, Implementation Details)
- **AND** exit 0 when all sections are present in order, exit 1 with findings when sections are missing or misordered

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


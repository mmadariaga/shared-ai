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
- **WHEN** the change-document check, which replaces the retired ready-to-propose check, is invoked on a crystallized change document
- **THEN** it validates the document with the structural checks of `sai/tools/change-document.js`, the single definition of `sai/policies/issue-format.md`
- **AND** exit 0 when the document conforms, exit 1 with findings when sections or `## Change` lines are missing, misordered, or malformed

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

### Requirement: Shared line-numbered AI attribution detection

The shared detector SHALL report recognized AI authorship credit lines as violations with file, one-based line, problem AI_ATTRIBUTION, and detail. It SHALL recognize generated-with, authored-by, assisted-by and AI Co-Authored-By credits, including model-family/version identities and known AI bot identities. Human coauthor credits SHALL be allowed without an attribution exception. The commit-rules CLI SHALL reject these credits by default; --allow-attribution SHALL skip only that check.

#### Scenario: Model family and version trailer
- **WHEN** content contains Co-Authored-By: Claude Sonnet 4.6 <bot@example.com> or a Gemini 2.5, DeepSeek V3, or GPT-4.1 identity
- **THEN** the detector reports AI_ATTRIBUTION at that line independently of the email address.

#### Scenario: Human coauthor credits
- **WHEN** content credits Claude Martin or Alice Smith
- **THEN** the detector returns no attribution violation for those lines.

#### Scenario: CLI exception preserves format validation
- **WHEN** commit-rules receives --allow-attribution with an invalid Conventional Commits subject and an AI credit
- **THEN** the credit check is skipped but the format violation remains.

### Requirement: Change-document check delegates to the change document tool

The `lint.js change-document` check SHALL obtain its verdict from the structural checks of `sai/tools/change-document.js` and MUST NOT carry a section list of its own. It SHALL report each violation of the tool as a lint finding with its line, problem, and detail. Hygiene pre-filter flags and their judgment SHALL NOT be lint findings. `lint.js` SHALL NOT offer a `ready-to-propose` check.

#### Scenario: A valid change document passes

- **WHEN** the change-document check runs on a dispatchable change document
- **THEN** it exits 0 with no findings

#### Scenario: Missing Change name fails through delegation

- **WHEN** the change-document check runs on a document whose `## Change` section has no `Change name:` line
- **THEN** it exits 1 and reports the tool's `MISSING_CHANGE_NAME` problem

#### Scenario: A retired block fails

- **WHEN** the change-document check runs on a `Ready to Propose` block
- **THEN** it exits 1 and reports the `RETIRED_FORMAT` problem

#### Scenario: lint.js holds no section list

- **WHEN** the `lint.js` source is read
- **THEN** it requires `./change-document.js`, does not mention `ready-to-propose`, and contains no list of document section names

### Requirement: The fetch-directives check reports directive-form violations

The `lint.js fetch-directives` check SHALL validate `Fetch` directives in a Markdown file or in every Markdown file below a directory. It SHALL report `FETCH_DIRECTIVE_FORM` for a marker not directly after the verb, a space between the marker and the verb, or a line that starts with a directive phrase whose whole phrase sits in a code span. It SHALL reuse the fetch tool's directive parser and SHALL treat a template path and a fenced or prose-span directive as payload.

#### Scenario: a marker separated from its verb is reported
- **WHEN** the check runs on a file that writes `Fetch ? @sai/policies/example.md`
- **THEN** it reports `FETCH_DIRECTIVE_FORM` at that line and exits 1

#### Scenario: a directive phrase in a code span is reported
- **WHEN** the check runs on a file whose directive puts the whole phrase in a code span instead of only its path
- **THEN** it reports `FETCH_DIRECTIVE_FORM` at that line and exits 1

#### Scenario: a conforming instruction root passes
- **WHEN** the check runs on the installed instruction roots, whose conditional directives carry the marker directly after the verb and whose paths sit alone in their code spans
- **THEN** it reports no violation and exits 0

### Requirement: The fetch-directives check reports marker and section-gate violations

`FETCH_MARKER_WITHOUT_CONDITION` SHALL be reported when a marked directive has no condition in its paragraph or its `##` section. `FETCH_UNMARKED_CONDITIONAL` SHALL be reported when an unmarked directive sits under a conditional `##` heading. The check SHALL report one finding per line, with the file, its one-based line, the problem code, and a detail, and SHALL exit 0 when conformant, 1 when findings are reported, and 2 on a usage or I/O error.

#### Scenario: a marked directive without a condition is reported
- **WHEN** the check runs on a marked directive whose paragraph and section state no condition
- **THEN** it reports `FETCH_MARKER_WITHOUT_CONDITION` at that line

#### Scenario: an unmarked directive under a conditional heading is reported
- **WHEN** an unmarked directive sits under a `##` heading that states a condition
- **THEN** it reports `FETCH_UNMARKED_CONDITIONAL` at that line with the heading in the detail

#### Scenario: a directory is checked file by file
- **WHEN** the check runs with a directory argument
- **THEN** every Markdown file below it is checked and each finding names its own file

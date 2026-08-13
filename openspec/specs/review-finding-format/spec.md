# review-finding-format Specification

## Purpose

Single source for the shared artifact review finding contract — severity vocabulary and criteria, finding shape, severity-prefixed identifiers, and closing summary tally — referenced by every artifact review surface.

## Requirements

### Requirement: Artifact reviews share one finding contract

Every artifact review SHALL draw its finding format from a single shared contract — the severity vocabulary and assignment criteria, the finding shape, the severity-prefixed identifier scheme, and the closing summary line — single-sourced in `sai/policies/artifact-review-contract.md`. The manual review loop in `sai-explore` and the pipeline-driven review phases (spec and design) SHALL reference that contract. Neither `sai/commands/explore/instructions.md` nor any capability spec other than this one SHALL redefine the finding shape, the severity criteria, the identifier scheme, or the summary-line format inline; consuming capabilities and instructions SHALL cite the shared contract by reference.

#### Scenario: manual loop references the shared contract

- **WHEN** the manual post-crystallization review loop produces a review of `proposal.md` and `specs/**` or of `design.md`, `tasks.md`, and `interfaces.md`
- **THEN** its findings, severities, identifiers, and closing summary follow `sai/policies/artifact-review-contract.md`

#### Scenario: pipeline phases reference the shared contract

- **WHEN** the supervised spec-phase or design-phase reviewer returns findings
- **THEN** those findings follow the same shared contract
- **AND** the reviewer instructions do not restate the finding shape, criteria, identifier scheme, or summary format

#### Scenario: no inline redefinition remains

- **WHEN** `sai/commands/explore/instructions.md` and every capability spec other than this one are audited
- **THEN** none of them redefines the severity criteria, the finding shape, the identifier scheme, or the summary-line format
- **AND** each of them references the shared contract instead

### Requirement: Artifact review findings use a closed severity vocabulary

Every artifact review finding SHALL carry exactly one severity from the closed set `High`, `Medium`, or `Low`. The reviewer SHALL NOT omit severity or emit another value. Assignment SHALL follow the contract's criteria, which preserve the existing semantics: `High` for a defect that, left uncorrected, would allow a materially incorrect, incomplete, or out-of-scope implementation, violate an explicit constraint, preserve a normative contradiction, or leave required behavior too untestable to implement reliably; `Medium` for a material clarity, coverage, consistency, or testability weakness that does not, on the reviewed evidence, prevent a bounded correct implementation or violate explicit scope; `Low` for a precision, readability, or maintainability improvement with no material effect on implementation correctness or scope.

#### Scenario: finding can materially misdirect implementation

- **WHEN** an artifact defect would allow a materially incorrect, incomplete, or out-of-scope implementation if left uncorrected
- **THEN** the reviewer assigns `High`

#### Scenario: finding is material but non-blocking

- **WHEN** an artifact has a meaningful clarity, coverage, consistency, or testability weakness but still supports bounded correct implementation
- **THEN** the reviewer assigns `Medium`

#### Scenario: finding has no material implementation effect

- **WHEN** a finding improves precision, readability, or maintainability without materially affecting implementation correctness or scope
- **THEN** the reviewer assigns `Low`

#### Scenario: out-of-set severity is never emitted

- **WHEN** an artifact review assigns severity
- **THEN** it emits exactly `High`, `Medium`, or `Low`
- **AND** it never emits another value such as `Critical`

### Requirement: Finding identifiers are derived from severity

Each artifact review finding SHALL carry an identifier derived from its severity: the severity's initial (`H`, `M`, or `L`) followed by the finding's sequence number within that severity in the current review (`H1`, `H2`, `M1`, `L1`, ...). The sequence SHALL restart at 1 for each severity at the start of every review, and identifiers SHALL be review-scoped: they SHALL NOT imply identity across reviews or passes. The `Severity` field SHALL remain the source of truth for severity validation; the identifier is a derived label and SHALL NOT be validated in place of the severity field. A finding whose severity is missing or outside the closed set SHALL NOT be assigned a derived identifier; the pipeline's severity-contract rejection evidence SHALL preserve such a finding's reviewer-supplied identifier verbatim.

#### Scenario: first finding of each severity

- **WHEN** a review's first `High` finding, first `Medium` finding, and first `Low` finding are emitted
- **THEN** they carry the identifiers `H1`, `M1`, and `L1` respectively

#### Scenario: subsequent findings continue the per-severity sequence

- **WHEN** a review emits a second `High` finding
- **THEN** it carries the identifier `H2`
- **AND** `Medium` and `Low` findings continue their own independent sequences

#### Scenario: identifiers are review-scoped

- **WHEN** a later review emits a finding of the same severity as an earlier review
- **THEN** its identifier restarts the sequence for that severity
- **AND** it does not imply identity with the earlier finding

#### Scenario: severity remains the validated field

- **WHEN** a finding's severity is validated against the closed set
- **THEN** the validation reads the `Severity` field
- **AND** it does not parse the identifier to derive or check severity

#### Scenario: contract-violating findings keep their reviewer-supplied identifier

- **WHEN** a finding's severity is missing or outside the closed set and the pass is rejected as a severity-contract violation
- **THEN** the finding is not assigned a derived identifier
- **AND** the rejection evidence preserves the reviewer-supplied identifier verbatim

### Requirement: Every artifact review closes with a summary tally

Every artifact review SHALL close with a `Summary:` line tallying its severity counts in the form `Summary: High=<count> Medium=<count> Low=<count>`. The manual review loop SHALL close each review with that plain form. Pipeline-driven reviews SHALL render the same tally within their existing per-pass deterministic reporting — the base tally prefixed by the pass number and followed by the pipeline-specific counters.

#### Scenario: manual review closes with a summary line

- **WHEN** the manual review loop completes a review transaction over available artifacts
- **THEN** the review closes with `Summary: High=<count> Medium=<count> Low=<count>`
- **AND** the counts match the review's findings

#### Scenario: pipeline pass reporting includes the tally

- **WHEN** a pipeline-driven review pass is reported
- **THEN** the deterministic pass reporting includes the contract's tally prefixed by the pass number and followed by the pipeline counters, e.g. `Summary: Pass <n> High=<count> Medium=<count> Low=<count> Contract-violations=<count>`

#### Scenario: no review content, no summary

- **WHEN** a requested artifact set does not exist and the review reports the absence without reviewing content
- **THEN** it produces no findings
- **AND** it produces no `Summary:` line

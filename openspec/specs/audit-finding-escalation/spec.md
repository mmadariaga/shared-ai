# audit-finding-escalation Specification

## Purpose

Audit findings that contradict existing specifications or exceed the change's declared scope are not implementation tasks—they are evidence that new changes need to be proposed. The Judgment Rubric for Audit Findings classifies findings as Apply (implementable fixes), Discard (informational only), or Escalate (scope or decision conflicts). When escalations are detected in artifact-analysis, the run emits a Ready to Propose block and stops before any code-writing steps proceed, preventing wasted implementation effort and enabling proper scope definition.

## Requirements

### Requirement: Three-outcome classification of audit findings

The Judgment Rubric for Audit Findings SHALL classify every finding in an audit artifact as Apply, Discard, or Escalate by evaluating five criteria: Severity, Actionability, Spec-decision consistency, Duplication, and Scope. Apply findings pass all five. Discard findings fail Severity, Actionability, or Duplication. Escalate findings fail Spec-decision consistency — the finding contradicts a decision in `design.md` or a requirement in `specs/**` — or fail Scope, proposing work beyond the change's declared scope that would require an acceptance criterion that does not yet exist.

#### Scenario: Finding contradicting existing requirement

- **WHEN** an audit artifact contains a finding identifying behavior contradicting a requirement in `openspec/specs/`
- **THEN** the finding SHALL be classified as Escalate, not Discard

#### Scenario: Finding proposing work needing new acceptance criteria

- **WHEN** an audit artifact contains a finding proposing work exceeding the change's scope and requiring a non-existent acceptance criterion
- **THEN** the finding SHALL be classified as Escalate, not Discard

#### Scenario: Finding passing all criteria

- **WHEN** an audit artifact contains a finding passing all five criteria
- **THEN** the finding SHALL be classified as Apply

### Requirement: Exclusive escalation detection in artifact-analysis

The artifact-analysis step SHALL detect all Escalate classifications by checking whether any finding was classified as Escalate after evaluating all findings in all audit artifacts. This detection SHALL occur in artifact-analysis only, not in plan-generation or any other step, and SHALL not be re-evaluated at append time.

#### Scenario: Escalation detection before continuation

- **WHEN** artifact-analysis completes classification of all findings from all audit artifacts in `openspec/changes/{change-name}/`
- **THEN** artifact-analysis SHALL check whether any finding was classified as Escalate before continuing

#### Scenario: Plan-generation receives escalation signal

- **WHEN** escalations were detected in artifact-analysis
- **THEN** plan-generation SHALL NOT generate `implementation.md` or append any audit steps

### Requirement: Escalation stop before plan-generation appends

When any finding is classified as Escalate, the run SHALL stop before plan-generation appends any audit-derived steps. No Escalate findings SHALL be rendered as code-writing checkboxes or any code action. No appended audit step SHALL be created when escalations exist.

#### Scenario: No audit steps when Escalate exists

- **WHEN** an audit artifact contains at least one Escalate finding
- **THEN** the run SHALL terminate before plan-generation appends any audit-derived steps

#### Scenario: Escalate findings do not become code actions

- **WHEN** a finding is classified as Escalate
- **THEN** the finding SHALL NOT appear as a code-writing checkbox or code action

### Requirement: Escalation handoff with Ready to Propose block

When Escalate findings are detected in artifact-analysis, the step SHALL emit one or more Ready to Propose blocks for new changes. Each block SHALL use the format from `sai/policies/ready-to-propose-format.md` and be returned as chat output, not written to disk. Each block SHALL contain a change name derived from the escalated work's substance, a summary, and a description citing source artifacts and finding ids as evidence.

#### Scenario: Block emitted for single escalation

- **WHEN** artifact-analysis detects Escalate findings in a single audit artifact
- **THEN** artifact-analysis SHALL emit a Ready to Propose block using the format from `sai/policies/ready-to-propose-format.md`

#### Scenario: Block cites artifacts and finding ids

- **WHEN** artifact-analysis emits a Ready to Propose block for Escalate findings
- **THEN** the **Why** field SHALL cite source artifacts and finding ids as evidence

### Requirement: Escalation grouping by scope of work

When multiple Escalate findings exist across artifacts, escalated findings SHALL be grouped by scope of work implication, not source artifact. Two findings from different artifacts belong in the same group when they describe the same missing change or overlapping capability gap. Each group receives one Ready to Propose block.

#### Scenario: Findings from different artifacts in same group

- **WHEN** an Escalate finding from review.md and one from security.md both describe the same missing capability
- **THEN** both findings SHALL belong to the same escalation group and receive one Ready to Propose block

#### Scenario: Findings from different artifacts in different groups

- **WHEN** an Escalate finding about missing authentication and one about missing configuration are both present
- **THEN** each SHALL belong to a different escalation group and receive a separate Ready to Propose block

### Requirement: Escalation block content and format

Each Ready to Propose block for an Escalation group SHALL include: a change name derived from escalated work's substance, a one-to-two-sentence work summary, a description of gaps or constraints revealed by findings, research leads pointing to referenced code and documentation (not artifact offsets), Edge Cases set to None, and Implementation Details set to None since only explore can establish those with the user.

#### Scenario: Block includes all required fields

- **WHEN** artifact-analysis emits a Ready to Propose block for an escalation group
- **THEN** the block SHALL include **Change name**, **What**, **Why**, **Research Leads**, **Edge Cases** as None, and **Implementation Details** as None

#### Scenario: Research Leads reference codebase, not artifacts

- **WHEN** artifact-analysis populates Research Leads in a Ready to Propose block
- **THEN** Research Leads SHALL contain repository-relative paths to referenced code or documentation, not artifact offsets or finding id suffixes

### Requirement: Terminal run status on escalation

When Escalate findings are detected, artifact-analysis SHALL return a terminal run status with all emitted Ready to Propose blocks as chat output. The run SHALL conclude without proceeding to plan-generation.

#### Scenario: Run terminates with block output

- **WHEN** artifact-analysis detects Escalate findings and emits Ready to Propose blocks
- **THEN** artifact-analysis SHALL return a terminal status with all blocks in the summary and stop the run

# report-template-parity Specification

## Purpose
Pin schema scaffolds and write-time contracts to a shared report skeleton and enforce parity with automated verification.

## Requirements

### Requirement: Schema scaffolds and write-time contracts share a pinned report skeleton

For each of the four report artifacts — review, security, performance, accessibility — the schema template at `openspec/schemas/sai-workflow/templates/{artifact}.md` and the write-time contract at `sai/commands/{phase}/{artifact}-report.template.md` SHALL present the same report structure: identical top-level `##` heading text in identical order, and an identical header metadata block with the same field labels and the same referenced value shapes (e.g. the change directory for the Change field). The two families SHALL diverge only in placeholder syntax (`<!-- -->` versus `{...}`), in the depth of fill-in guidance, and in code-fence wrapping.

#### Scenario: Review pair presents the pinned structure

- **WHEN** `openspec/schemas/sai-workflow/templates/review.md` and `sai/commands/review/review-report.template.md` are read
- **THEN** both expose the same top-level heading sequence — Summary, Domain Alignment Check, Security Surface Triage, Performance Surface Triage, Accessibility Surface Triage, Findings, Mutation Analysis (Pass 11), Coverage Notes, Next Steps — and the same header metadata field labels — Change, Branch reviewed, Parent branch, Commits in scope, Files changed, Date — and their Mutation Analysis sections expose the same bold field set (Strategy, Test command, Mutations decided, Aggregate)

#### Scenario: Security pair presents the pinned structure

- **WHEN** `openspec/schemas/sai-workflow/templates/security.md` and `sai/commands/security/security-report.template.md` are read
- **THEN** both expose the same top-level heading sequence — Not Applicable, Executive Summary, Module Summary, SAST Findings, SCA Findings, Supply Chain Hygiene, License Risk, Policy Compliance, Acknowledged Trade-offs (from change artifacts), Prioritized Remediation Plan, Metrics — and the same header metadata field labels, with the scaffold carrying the Supply Chain Hygiene, License Risk, Policy Compliance, and Acknowledged Trade-offs (from change artifacts) sections it currently lacks

#### Scenario: Performance pair presents the pinned structure

- **WHEN** `openspec/schemas/sai-workflow/templates/performance.md` and `sai/commands/performance/performance-report.template.md` are read
- **THEN** both expose the same top-level heading sequence — Not Applicable, Executive Summary, Hot Paths in Scope, Findings, Acknowledged Trade-offs (from change artifacts), Observability Gaps, Prioritized Remediation Plan, Validation Plan — and the same header metadata field labels

#### Scenario: Accessibility pair presents the pinned structure

- **WHEN** `openspec/schemas/sai-workflow/templates/accessibility.md` and `sai/commands/accessibility/accessibility-report.template.md` are read
- **THEN** both expose the same top-level heading sequence — Not Applicable, Executive Summary, Findings, Acknowledged Trade-offs (from change artifacts), Coverage Notes, Prioritized Remediation Plan, Re-Test Checklist — and the same header metadata field labels

#### Scenario: Divergence is limited to the allowed dimensions

- **WHEN** a reviewer compares any of the four template pairs after reconciliation
- **THEN** every remaining difference between the two sides is one of the three allowed dimensions — placeholder syntax, fill-in guidance depth, or code-fence wrapping — and no difference alters heading text, heading order, header field labels, or header field value shapes

### Requirement: Report template parity is enforced by automated verification

The repository SHALL include a test at `test/report-template-parity.test.js` that reads all four template pairs and asserts, per pair, identical top-level `##` heading text in identical order, identical header metadata field labels, and the review pair's Mutation Analysis bold field set. The test SHALL fail when a heading, a header metadata field label, or a pinned Mutation Analysis field appears on one side of a pair without appearing on the other.

#### Scenario: Parity holds and the test passes

- **WHEN** the four template pairs are in parity and the test suite runs
- **THEN** `test/report-template-parity.test.js` passes together with the rest of `node --test`

#### Scenario: Drift on one side fails the test

- **WHEN** a top-level heading is added to a schema template without being added to its write-time contract (or vice versa)
- **THEN** `test/report-template-parity.test.js` fails and identifies the divergent pair and heading

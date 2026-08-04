# security-phase-worker Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.
## Requirements

### Requirement: Security worker owns the complete technical workflow

The routed security worker SHALL own envelope parsing, prerequisite checks, change resolution, parent-branch detection, diff scoping, SAST, conditional SCA, report generation, report verification, and the lifecycle summary. The routed worker and the Copilot inline caller SHALL load the shared `sai/commands/security/invocation.md` core, which SHALL load the budget behavior, security instruction, and remember policy without taking ownership of lifecycle control.

#### Scenario: Routed worker starts from an invocation envelope
- **WHEN** a routed security worker receives the harness envelope
- **THEN** it performs the complete technical security workflow from that envelope and durable repository state
- **AND** it returns artifact paths and summary data rather than report contents in the lifecycle payload

#### Scenario: Copilot starts inline security
- **WHEN** the Copilot inline security path starts
- **THEN** it uses the same security invocation core and security instruction source
- **AND** its technical audit behavior remains aligned with the routed worker

### Requirement: Worker preserves security prerequisites, argument parsing, and diff scope

Before analysis, the worker SHALL enforce the existing OpenSpec CLI, `openspec/` directory, `schema: sai-workflow`, and required `proposal.md` prerequisites. It SHALL preserve the existing change-name and optional `--full` or `--path` scope arguments, zero/one/multiple-change selection behavior, missing-proposal failure text, and parent-branch detection order of user input, remote default, verified `master`, then verified `main`. It SHALL state the selected parent branch, inspect only the selected scope, use the existing file list/stat/diff workflow, and apply the 500-LOC full-diff cutover.

#### Scenario: Proposal prerequisite is missing
- **WHEN** `openspec/changes/{change-name}/proposal.md` is absent
- **THEN** the worker returns the existing actionable missing-proposal failure
- **AND** it performs no audit analysis and writes no `security.md`

#### Scenario: Large diff is encountered
- **WHEN** the selected diff exceeds 500 LOC
- **THEN** the worker does not load the full diff into its main context and delegates file or logical-group inspection within the existing cap

#### Scenario: Empty diff is encountered
- **WHEN** the selected diff is empty
- **THEN** the worker completes the existing no-change security outcome without creating findings or modifying protected files

### Requirement: SAST, SCA, and research delegation preserve the existing security policy

The worker SHALL preserve the existing SAST flaw categories, direct-and-obvious CWE mapping, severity vocabulary, taint-flow requirements, concrete evidence requirements, diff-only rule, and no-speculation rule. It SHALL run SCA only when a dependency manifest changes and SHALL preserve dependency extraction, CVE/version-range evidence, CVSS severity, fix availability, and license checks. It SHALL use `budget-explorer` for delegated research, declare the existing per-call output contract, cap total explorer invocations at eight, and authorize only bounded read-only execution of applicable dependency-audit tools such as `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, and `osv-scanner`; it SHALL never install, update, or rewrite dependencies.

#### Scenario: Code-only diff is audited
- **WHEN** the scoped diff modifies code but no dependency manifest
- **THEN** the worker performs the required SAST analysis with concrete locations and evidence
- **AND** it skips SCA and states that no dependency changes in the diff caused SCA to be skipped

#### Scenario: Dependency manifest changes
- **WHEN** the scoped diff modifies a supported dependency manifest
- **THEN** the worker performs SCA using only bounded read-only audit execution and records CVE, affected version range, fix, severity, and license evidence where applicable
- **AND** it does not modify the manifest, lockfile, dependencies, or configuration

### Requirement: Worker writes and verifies only the security artifact

The worker SHALL write and verify only `openspec/changes/{change-name}/security.md`, using the existing security report template and preserving concise executive summary, concrete findings, severity counts, acknowledged trade-offs, and applicable SCA sections. Every SAST finding SHALL have precise location and required evidence, every SCA finding SHALL have CVE and affected version-range evidence, speculative or pre-existing issues SHALL be excluded, and the completed summary SHALL report severity counts, top Critical/High findings when present, the report path, and the selected parent branch without embedding report contents.

#### Scenario: Security report completes
- **WHEN** all applicable audit phases and self-critique checks complete
- **THEN** `security.md` exists, is non-empty, and contains only evidence-backed findings in the selected scope
- **AND** the worker returns `completed` with the canonical change name, report path, summary, and `changed_files` containing only `security.md`

#### Scenario: Audit needs no findings
- **WHEN** the scoped code and dependencies contain no concrete security flaw
- **THEN** the worker omits speculative and exhaustive clean-category findings
- **AND** it still writes and verifies the concise security artifact without modifying production code, dependency files, or configuration

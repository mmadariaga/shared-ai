# security-phase-worker Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.

## Requirements

### Requirement: Security worker owns the complete technical workflow

The security worker SHALL own parent-branch detection, diff scoping, SAST, conditional SCA, report generation, report verification, and the completed summary; change resolution, the `proposal.md` gate, and argument validation SHALL belong to the shared audit coordinator `sai/commands/audit/coordinator.md`. OpenSpec environment prerequisite checks SHALL belong to `/sai-explore` alone and SHALL NOT be part of worker startup. The worker SHALL load `sai/commands/audit/worker-common.md` and `sai/commands/security/steps/common.md` at creation together with its worker card, run the fileless `resolve-security-scope` step from the brief and that surface before following the first pointer, and thereafter execute ONLY the step named by the coordinator's most recent `Active step:` pointer line — never prefetching, opening, or following any other step instruction file; the wholesale `sai/commands/security/invocation.md` fetch chain SHALL NOT be part of the worker's instruction loading.

#### Scenario: Routed worker starts from an invocation envelope
- **WHEN** the security worker receives its task brief naming the change, the options, and the report path
- **THEN** it performs the technical security workflow from that brief and durable repository state without resolving the change or running OpenSpec environment prerequisite checks
- **AND** it returns the report path, counts, and summary rather than report contents in its result

#### Scenario: Sealed initial surface replaces the wholesale invocation fetch
- **WHEN** the security worker is created
- **THEN** its initial surface references only its card, `sai/commands/audit/worker-common.md`, and `sai/commands/security/steps/common.md`, with every other step path first arriving inside a coordinator `Active step:` pointer line
- **AND** the security policy content remains single-sourced across the carved step files

#### Scenario: Monolith is retired
- **WHEN** the step-gated security delivery is in force
- **THEN** neither `sai/commands/security/instructions.md` nor `sai/commands/security/invocation.md` exists, and the install manifest carries a retirement for each installed copy

### Requirement: SAST, SCA, and research delegation preserve the existing security policy

The worker SHALL preserve the existing SAST flaw categories, direct-and-obvious CWE mapping, severity vocabulary, taint-flow requirements, concrete evidence requirements, diff-only rule, and no-speculation rule. It SHALL run SCA only on the dependency manifests the SCA gate admits and SHALL preserve dependency extraction, CVE/version-range evidence, CVSS severity, and fix availability; it SHALL NOT perform a license check or record license evidence. It SHALL use `budget-explorer` for delegated research, declare the existing per-call output contract, cap total explorer invocations at eight, and authorize only bounded read-only execution of applicable dependency-audit tools such as `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, and `osv-scanner`; it SHALL never install, update, or rewrite dependencies, manifests, lockfiles, production files, or configuration.

#### Scenario: Code-only diff is audited
- **WHEN** the scoped diff modifies code but no dependency manifest
- **THEN** the worker performs the required SAST analysis with concrete locations and evidence
- **AND** it skips SCA, and the report's provenance-line scan type names only the analyses that ran

#### Scenario: Dependency manifest changes
- **WHEN** the scoped diff modifies a supported dependency manifest
- **THEN** the worker performs SCA using only bounded read-only audit execution and records CVE, affected version range, fix, severity, and CVE source evidence where applicable, with no license field
- **AND** it does not modify the manifest, lockfile, dependencies, or configuration

### Requirement: Worker writes and verifies only the security artifact

The worker SHALL write and verify only `openspec/changes/{change-name}/security.md`, using the security report template as amended by the shared audit severity vocabulary — a severity-prefixed identifier on every finding and a closing `Summary:` tally line. The report SHALL open with a single provenance line carrying the scope with its parent branch, the scan type, and the date, and SHALL contain only the sections a consumer reads: `## Not Applicable` when the audit does not apply, `## SAST Findings`, `## SCA Findings` when SCA ran, the optional `## Acknowledged Trade-offs (from change artifacts)`, and the closing tally; a section with no content SHALL be omitted. The report SHALL NOT contain an Executive Summary, Module Summary, Supply Chain Hygiene, License Risk, Policy Compliance, Prioritized Remediation Plan, or Metrics section. Every SAST finding SHALL have precise location and required evidence, every SCA finding SHALL have CVE and affected version-range evidence, speculative or pre-existing issues SHALL be excluded, and the completed summary SHALL report severity counts, top Critical/High findings when present, the report path, and the selected parent branch without embedding report contents. The worker SHALL verify the saved file in its form before returning `completed`; the coordinator SHALL verify it again with the deterministic `audit-report` check before committing it.

#### Scenario: Security report completes
- **WHEN** all applicable audit steps and the hard-rule check of the draft complete
- **THEN** `security.md` exists, is non-empty, and contains only evidence-backed findings in the selected scope, each with its severity-prefixed identifier and the closing summary tally
- **AND** the worker returns `completed` with the report path, counts without an `informational` key, summary, and `changed_files` containing only `security.md`

#### Scenario: Audit needs no findings
- **WHEN** the scoped code and dependencies contain no concrete security flaw
- **THEN** the worker writes the provenance line and a closing tally of zeros, listing no clean category
- **AND** it still writes and verifies the security artifact without modifying production code, dependency files, or configuration

#### Scenario: Not Applicable report is verified
- **WHEN** the worker saves a Not Applicable report
- **THEN** it verifies the provenance line and the `## Not Applicable` section with its justification, with no findings sections and no tally
- **AND** the completed summary carries the justification in place of severity counts and findings, with all-zero counts

### Requirement: Security findings carry severity-prefixed identifiers and a closing summary tally

The security instruction and report contract SHALL assign every finding a severity-prefixed identifier — the severity's initial followed by the finding's sequence within that severity in the current report (`C1`, `H1`, `M1`, `L1`), with the sequence restarting at 1 for each severity at the start of every report. The security report SHALL close with a `Summary:` line in the form `Summary: Critical=<count> High=<count> Medium=<count> Low=<count>` whose counts match the report's findings. The four-level `Critical`/`High`/`Medium`/`Low` taxonomy, the CVSSv3 mapping, and the severity floor (observations below `Low` and `Informational`-level observations are omitted) SHALL remain unchanged.

#### Scenario: SAST finding carries an identifier

- **WHEN** the security report lists a SAST or SCA finding
- **THEN** the finding heading leads with its severity-prefixed identifier
- **AND** identifiers restart at 1 per severity per report

#### Scenario: Report closes with the summary tally

- **WHEN** the security report is complete
- **THEN** it closes with a `Summary:` line tallying `Critical`, `High`, `Medium`, and `Low` counts that match the listed findings
- **AND** the tally does not include an `Informational` counter

### Requirement: Security lifecycle results carry no time field

The security worker SHALL return `step-done`, `question`, and terminal results with no time field, while retaining SAST, SCA, report, and no-production-write boundaries.

#### Scenario: Security reports a milestone
- **WHEN** a security step completes
- **THEN** its `step-done` result carries the step ids and no time field.

#### Scenario: Severity floor is unchanged

- **WHEN** a candidate observation falls below the `Low` severity
- **THEN** it is omitted from the report under the existing severity floor
- **AND** it does not appear in the closing tally

### Requirement: Security close runs a pre-save adversarial findings check
The security close step SHALL challenge the in-memory draft before saving to discard false positives and correct severity. It SHALL skip the adversary on zero findings, otherwise dispatch exactly one budget-explorer subagent receiving only per-finding identifier, file:line, taint flow source to propagation to sink for SAST or CVE plus version range for SCA, and one-line exploit scenario without diff or raw code, scope the adversary to current diff findings only, require per-finding keep or discard or downgrade verdict with why under 40 words and total report under 800 words, let the worker accept or reject each verdict with discards invisible and tally recomputed over kept findings at final severity, and close with worker findings on subagent failure without blocking.
#### Scenario: Adversarial check filters security draft
- **WHEN** the in-memory security draft contains findings
- **THEN** the worker runs one bounded adversary and saves only kept findings with recomputed Summary tally

### Requirement: Security discovery decides the SCA gate and the not-applicable outcome

The `discover-module-map` step SHALL be the single place that decides the SCA gate — admitting each dependency manifest the diff introduces or modifies in diff mode, or that the selected scope contains in `--full` or `--path` mode — and the not-applicable outcome. When the selected scope has no attack surface (external input source, entry point, or trust boundary) and the gate admits no manifest, the worker SHALL report `discover-module-map`, `resolve-sast-analysis`, and `resolve-sca` together in that step's `step-done` batch, and `close-security-outcome` SHALL write a Not Applicable report holding only the title, the provenance line, and `## Not Applicable` with its justification. When the gate admits no manifest and the audit applies, the SAST `step-done` batch SHALL also carry `resolve-sca`, and the report SHALL say that SCA did not run and why.

#### Scenario: Scope has no attack surface and no admitted manifest
- **WHEN** discovery finds no attack surface in the selected scope and the SCA gate admits no manifest
- **THEN** the worker reports `discover-module-map`, `resolve-sast-analysis`, and `resolve-sca` in one `step-done` batch
- **AND** `close-security-outcome` writes the Not Applicable report and the worker returns `completed`

#### Scenario: Gate admits no manifest on an applicable audit
- **WHEN** the audit applies and the SCA gate admits no manifest
- **THEN** the SAST `step-done` batch carries both `resolve-sast-analysis` and `resolve-sca`

### Requirement: Security steps state observable completion criteria

Each filed security step SHALL state an observable completion criterion. `discover-module-map` SHALL be done when every file in the selected scope is assigned to a module and every dependency manifest has its SCA gate decision. `resolve-sast-analysis` SHALL be done when every file in the selected scope has been checked against every flaw category, every external input source is traced to its sinks, and every flaw is recorded with its fields; the report SHALL gain no per-category record. `resolve-sca` SHALL be done when every admitted manifest is audited and every vulnerable dependency is recorded. `close-security-outcome` SHALL be done when `security.md` is saved, verified in its form, and `completed` is returned.

#### Scenario: SAST step completes
- **WHEN** the worker finishes `resolve-sast-analysis`
- **THEN** every in-scope file has been checked against every flaw category and every external input source has been traced to its sinks before `step-done` is returned

### Requirement: Security instruction rules are stated once

The security worker card, the shared `sai/commands/audit/worker-common.md`, and the step files SHALL state each rule once, beside the step that decides or uses it. `steps/common.md` SHALL define accepted trade-offs with their source documents (`proposal.md`, `design.md`, `specs/**/*.md`), the selected scope, the write scope (the only deliverable is `security.md`), and the identifier-and-tally rule; steps SHALL refer to "the selected scope" and to accepted trade-offs without restating them. The worker card SHALL carry the five step ids and the batch that reports each in one Steps section, and the pointer and result rules SHALL live in `worker-common.md`. The `resolve-sca` step id SHALL stay unchanged.

#### Scenario: Step refers to the selected scope
- **WHEN** a security step file names the scope it operates on
- **THEN** it uses "the selected scope", and only `steps/common.md` defines the difference between diff, `--full`, and `--path`

#### Scenario: Plan label for the SCA step
- **WHEN** the security worker card or `steps/resolve-sca.md` names the `resolve-sca` step
- **THEN** its id is `resolve-sca`

### Requirement: Security worker takes the change and options from the coordinator brief

The worker SHALL NOT parse `arguments_value`, resolve the change, or present a change picker: it SHALL take the change name and the options from the coordinator's brief, which the coordinator has already validated against `sai/commands/security/options.md` after verifying `proposal.md`. It SHALL NOT run or restate the OpenSpec CLI, `openspec/` directory, or `schema: sai-workflow` prerequisite checks. Parent-branch detection SHALL follow this order: the `--parent-branch` value, remote default, verified `master`, then verified `main`. It SHALL state the selected parent branch, inspect only the selected scope, use the existing file list/stat/diff workflow, apply the 500-LOC full-diff cutover, and ask nothing the change, its artifacts, or the repository can answer.

#### Scenario: Proposal prerequisite is missing
- **WHEN** `openspec/changes/{change-name}/proposal.md` is absent
- **THEN** the audit coordinator ends the run with its missing-proposal line before creating the worker
- **AND** no audit analysis runs and no `security.md` is written

#### Scenario: Large diff is encountered
- **WHEN** the selected diff exceeds 500 LOC
- **THEN** the worker does not load the full diff into its main context and delegates file or logical-group inspection within the existing cap

#### Scenario: Empty diff is encountered
- **WHEN** the selected diff is empty
- **THEN** the worker writes the Not Applicable report and returns `completed` without creating findings or modifying protected files

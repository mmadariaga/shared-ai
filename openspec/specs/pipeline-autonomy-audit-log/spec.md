# pipeline-autonomy-audit-log Specification

## Purpose
TBD - created by archiving change add-pipeline-autonomous-question-answering. Update Purpose after archive.
## Requirements
### Requirement: Auto-answered questions are reported at every phase ending

The supervised spec phase ends by any of its documented terminal outcomes — convergence, cap exhaustion, or a `failed` or `cancelled` spec-proposal worker. At every such ending, `sai-explore` SHALL present an audit log of the autonomous answering it performed during that phase. The log SHALL list, for every question explore auto-answered, the worker's question, the answer explore gave, and the reasoning behind that answer. The reasoning SHALL include the grounding citation required by the pipeline question-autonomy capability — which permitted grounding source, and what within it, determined the answer — rather than free prose alone, so the log is the verification surface for the grounding gate and a later reader can distinguish a properly grounded answer from a confident-sounding one. The audit log SHALL be presented in the conversation, so the user can review each decision made on their behalf. Presenting the log at a `failed` or `cancelled` ending is required precisely because auto-answers made before a failure would otherwise be buried by that failure. It reframes the user from answering every question to auditing the answers that were given.

#### Scenario: auto-answers are listed when the phase converges
- **WHEN** the supervised spec phase reaches a converged or cap-exhausted ending after explore auto-answered one or more worker questions
- **THEN** explore presents an audit log in the conversation
- **AND** for each auto-answered question the log states the worker's question, the answer given, and the reasoning
- **AND** the reasoning cites which permitted grounding source, and what within it, determined the answer

#### Scenario: auto-answers are surfaced even when the phase fails
- **WHEN** the supervised spec phase ends by a `failed` or `cancelled` worker after explore auto-answered one or more worker questions
- **THEN** explore still presents the audit log for those auto-answers in the conversation
- **AND** it does not bury the recorded decisions behind the failure

#### Scenario: no auto-answers means an empty audit report
- **WHEN** the supervised spec phase ends and explore auto-answered no worker questions
- **THEN** the audit log records no auto-answered entries
- **AND** explore does not fabricate entries for questions that were escalated to the user

### Requirement: The audit log reports the escalation denominator

The audit log SHALL state how many questions were escalated to the user during the phase alongside how many were auto-answered, so the auto-answer ratio is visible as a calibration signal for a later revisit of the thresholded behavior. It SHALL report the escalated count as an aggregate only; it SHALL NOT reproduce the content of escalated questions, which the user already saw and answered.

#### Scenario: the log shows the auto-answered-versus-escalated ratio
- **WHEN** explore presents the audit log at phase end
- **THEN** it states the count of auto-answered questions and the count of escalated questions for the phase
- **AND** it does not reproduce the content of any escalated question

### Requirement: The audit log is never persisted

The autonomy audit log SHALL be presented in conversation only. Explore SHALL NOT write the audit log, or any of its entries, to any file, OpenSpec artifact, change directory, or configuration. This matches the in-conversation-only discipline the explore tracked sets already follow.

#### Scenario: audit log is not written to any artifact
- **WHEN** explore presents the autonomy audit log
- **THEN** it writes no file, artifact, or configuration containing the log or its entries
- **AND** the log exists only in the conversation

### Requirement: Pinned audit layout is single-sourced in a shared policy
The autonomy audit log SHALL be rendered in the pinned scannable layout single-sourced at `sai/policies/autonomy-audit-log.md`, which owns the fixed field order, the empty-report case, the never-persist invariant, and the no-escalated-content invariant; emitting contracts SHALL supply only their phase label and SHALL NOT restate the layout inline. The extraction is behavior-neutral: auto-answer machinery, counters, and audit emission remain explore-only.

#### Scenario:
- **WHEN** a supervised phase ends and explore renders the autonomy audit
- **THEN** it invokes the shared layout with its phase label and presents the pinned empty report without fabricated entries when nothing was auto-answered

### Requirement: The guard's violation line is pinned in the shared audit layout

The autonomy-audit-log policy SHALL own a `## Incident line (no-commit guard)` section pinning the one visible violation line the no-commit guard's coordinator prints per remediation, in the fixed field order: `> NO-COMMIT GUARD: unauthorized commit(s) detected after <worker label> dispatch — reset to <base> (mixed); commits preserved unstaged; evidence: <sha> <subject>[; <sha> <subject>]`. Like the audit log, the line SHALL be conversation-only: NEVER written to any file, artifact, change directory, or configuration, and never more than one line printed per violation. `<worker label>` is the dispatched worker's name, `<base>` is the window's `guard_base`, and the evidence pairs come verbatim from the verify payload's `commits` list; when that list is empty the evidence field SHALL read exactly `evidence: none reported`. The section SHALL also record that every coordinator surface fetching `@sai/policies/no-commit-guard.md` consumes the layout by reference.

#### Scenario: a remediation prints exactly one pinned line

- **WHEN** the guard remediates a violation whose evidence lists one unauthorized commit
- **THEN** the coordinator prints exactly one conversation line in the pinned field order carrying the worker label, the guard_base, and that commit's sha and subject
- **AND** no incident text is written to any file or artifact


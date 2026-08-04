# pipeline-question-escalation Specification

## Purpose
TBD - created by archiving change add-pipeline-autonomous-question-answering. Update Purpose after archive.
## Requirements
### Requirement: Below-threshold questions escalate to the user unchanged

When the pipeline question-autonomy gate does not auto-answer a supervised spec-proposal worker's `needs_input` question — because confidence is not clearly above the threshold or the question is ambiguous — `sai-explore` SHALL surface that question to the user. It SHALL present the worker's exact question text and, for a closed-choice question, the worker's exact option labels and values unmodified, through the harness-native option picker. Explore SHALL then continue the same worker with the user's selected value according to the existing routed worker lifecycle. Explore SHALL NOT rephrase the question, add, drop, reorder, or relabel options, or answer in the user's place on this path.

#### Scenario: below-threshold closed-choice question is escalated
- **WHEN** the autonomy gate declines to auto-answer a closed-choice worker question
- **THEN** explore presents the worker's exact question and exact options through the harness-native picker
- **AND** after the user selects, explore continues the same worker with that exact value

#### Scenario: worker question and options are forwarded verbatim
- **WHEN** explore escalates a supervised worker question
- **THEN** the presented question text and option values match the worker's payload exactly
- **AND** explore neither rephrases the question nor alters, adds, or drops any option

#### Scenario: open-ended worker question is escalated for a free-form answer
- **WHEN** the autonomy gate declines to auto-answer a worker question that carries no closed option set
- **THEN** explore presents the worker's exact question to the user for a free-form answer
- **AND** it forwards the user's answer to the same worker

### Requirement: Escalation is the safe default, never a silent auto-answer

An escalated question SHALL always reach the user; explore SHALL NOT convert a question routed to escalation into an autonomous answer. When the autonomy gate is unclear about whether confidence clears the threshold, the question is escalated, not auto-answered. The content of escalated questions is not recorded as entries in the autonomy audit log, because the user directly saw and answered them; the log MAY still include the aggregate count of escalated questions as the calibration denominator defined by the pipeline autonomy-audit-log capability.

#### Scenario: an escalated question is never silently auto-answered
- **WHEN** a worker question is routed to escalation
- **THEN** explore waits for the user's answer before continuing the worker
- **AND** it does not substitute an answer of its own

#### Scenario: escalated question content is absent from the audit log
- **WHEN** the supervised spec phase ends after one or more questions were escalated
- **THEN** the content of those escalated questions is not listed as auto-answered entries in the autonomy audit log
- **AND** the log may still report the count of escalated questions as the calibration denominator


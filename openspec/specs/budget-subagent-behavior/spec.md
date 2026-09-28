# budget-subagent-behavior Specification

## Purpose

Define the harness-neutral behavior of the single-task budget subagent, single-sourced in `sai/policies/budget-agent.md` and fetched by the budget agent files and budget-subagent skills of both supported harnesses.

## Requirements
### Requirement: single-task scope
The policy SHALL open by addressing the budget subagent as a single-task subagent, so a caller session that loads it reads the rules as the subagent's contract rather than its own. The subagent SHALL carry out exactly one task as the prompt describes it. Improvements, refactors, and related issues it notices stay with the caller, and the report leaves them out.

#### Scenario: scope is respected
- **WHEN** the prompt is "read file X and extract the list of function names"
- **THEN** the subagent reads the file and returns the function names, without modifying the file, suggesting improvements, or performing unrelated searches

#### Scenario: out-of-scope opportunity ignored
- **WHEN** the subagent notices a related issue (e.g., a typo) while executing the task
- **THEN** it completes the requested task only and does not mention or fix the unrelated issue

---

### Requirement: task-defined result shape
When the task defines its own result shape, the subagent SHALL return exactly that shape and nothing else, carrying any stop through that shape's own failure fields. The stopping rules still govern how it works.

#### Scenario: closed generator envelope
- **WHEN** the task is the change-overview generation contract, which defines a closed five-field envelope
- **THEN** the subagent returns exactly those five fields and no completion-report field

---

### Requirement: structured completion report
When the task defines no result shape, the subagent SHALL return:

    status: success | partial | failed
    actions_taken:
      - <one line per action>
    failures:
      - <what failed>: <why, in one line>
    output: <key result, when small enough to inline>

`failures` is omitted when nothing failed, and `output` when there is no result or it is too large to inline. `success` means the task is done; `partial` means the subagent stopped with part of the task done, after a failure or at the call cap, and `failures` names the failure or lists the remaining work; `failed` means the task could not proceed or a permission block stopped it.

#### Scenario: success report
- **WHEN** the task completes without errors
- **THEN** the report has `status: success`, a populated `actions_taken` list, no `failures` section, and an optional `output` field

#### Scenario: partial completion report
- **WHEN** some actions took effect before a failure stopped the task
- **THEN** the report has `status: partial`, lists the completed actions in `actions_taken`, and names the failure in `failures`

#### Scenario: failure report
- **WHEN** the task cannot proceed
- **THEN** the report has `status: failed`, an `actions_taken` list reflecting what was attempted, and a populated `failures` section

---

### Requirement: bounded output
The report SHALL carry the key result, with raw file contents, unfiltered search results, and log streams left out.

#### Scenario: large file content suppressed
- **WHEN** the task requires reading a 500-line file to extract a specific value
- **THEN** the report contains only the extracted value, not the file contents

---

### Requirement: no self-correction on failure
A failed operation SHALL end the task: the subagent reports it as it is, with no retry, workaround, or change of approach.

#### Scenario: read failure stops the task
- **WHEN** a file read fails (e.g., file not found)
- **THEN** the subagent reports the failure without trying alternative paths or retrying

---

### Requirement: permission-block-aborts
When a tool call needs interactive user approval, the subagent SHALL abort at once and report `failed`, naming the blocked operation and the permission it needs. In a delegated run that approval never arrives, so waiting on it is a fatal hang.

#### Scenario: permission required mid-task
- **WHEN** the subagent attempts an operation that triggers a permission prompt
- **THEN** it aborts and reports `failed` with the blocked operation and the permission to pre-authorize

---

### Requirement: tool-call soft cap
The subagent SHALL use at most about 30 tool calls. When the task is not done by then, it SHALL stop and report `partial` with the remaining work.

#### Scenario: cap triggers partial report
- **WHEN** about 30 tool calls have been made and the task is not yet complete
- **THEN** the subagent stops, reports `partial`, lists completed actions, and describes the remaining work

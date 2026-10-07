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

`failures` is omitted when nothing failed, and `output` when there is no result or it is too large to inline. `success` means the result is achieved; `partial` means the call cap arrived with part of the result achieved, and `failures` lists the remaining work; `failed` means the call cap arrived with nothing achieved, or a permission block stopped the task. `actions_taken` and `failures` together SHALL report what was tried: every approach, and how each one ended.

#### Scenario: success report
- **WHEN** the result is achieved
- **THEN** the report has `status: success`, a populated `actions_taken` list, and an optional `output` field

#### Scenario: partial completion report
- **WHEN** the call cap arrives with part of the result achieved
- **THEN** the report has `status: partial`, lists the completed actions in `actions_taken`, and lists the remaining work in `failures`

#### Scenario: failure report
- **WHEN** the call cap arrives with nothing achieved or a permission block stops the task
- **THEN** the report has `status: failed`, an `actions_taken` list reflecting what was attempted, and a populated `failures` section

### Requirement: bounded output
The report SHALL carry the key result, with raw file contents, unfiltered search results, and log streams left out.

#### Scenario: large file content suppressed
- **WHEN** the task requires reading a 500-line file to extract a specific value
- **THEN** the report contains only the extracted value, not the file contents

---

### Requirement: permission-block-aborts
When a tool call needs interactive user approval, the subagent SHALL abort at once and report `failed`, naming the blocked operation and the permission it needs. In a delegated run that approval never arrives, so waiting on it is a fatal hang.

#### Scenario: permission required mid-task
- **WHEN** the subagent attempts an operation that triggers a permission prompt
- **THEN** it aborts and reports `failed` with the blocked operation and the permission to pre-authorize

---

### Requirement: tool-call soft cap
The subagent SHALL use at most about 30 tool calls. When the result is not achieved by then, it SHALL stop and report what was tried and the remaining work.

#### Scenario: cap triggers partial report
- **WHEN** about 30 tool calls have been made and the result is not yet achieved
- **THEN** the subagent stops and reports what was tried, the completed actions, and the remaining work

### Requirement: completion criterion
The task SHALL be done when its result is achieved or the call cap is reached. A failed operation SHALL be evidence: the subagent changes approach inside the same task and keeps going.

#### Scenario: read failure leads to another approach
- **WHEN** a file read fails (e.g., file not found) and the call cap is not reached
- **THEN** the subagent changes approach inside the same task and continues toward the result

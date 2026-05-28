## ADDED Requirements

### Requirement: single-task scope
The budget-subagent skill SHALL execute exactly one task as described in the prompt. It MUST NOT expand scope, refactor unrelated code, suggest improvements, or perform work beyond what was explicitly requested.

#### Scenario: scope is respected
- **WHEN** the prompt is "read file X and extract the list of function names"
- **THEN** the subagent reads the file and returns the function names, without modifying the file, suggesting improvements, or performing unrelated searches

#### Scenario: out-of-scope opportunity ignored
- **WHEN** the subagent notices a related issue (e.g., a typo) while executing the task
- **THEN** it completes the requested task only and does not mention or fix the unrelated issue

---

### Requirement: no self-correction on failure
The budget-subagent skill MUST NOT retry a failed sub-operation, attempt workarounds, or modify its approach to force a different outcome. It SHALL report the failure as-is and stop.

#### Scenario: read failure stops the task
- **WHEN** a file read fails (e.g., file not found)
- **THEN** the subagent reports the failure immediately without trying alternative paths or retrying

---

### Requirement: minimize output verbosity
The budget-subagent skill MUST NOT dump raw file contents, unfiltered search results, or verbose log streams in its response. Output SHALL be limited to the completion report fields.

#### Scenario: large file content suppressed
- **WHEN** the task requires reading a 500-line file to extract a specific value
- **THEN** the report contains only the extracted value, not the file contents

---

### Requirement: structured completion report
Upon finishing (successfully or not), the budget-subagent skill SHALL return a structured report with exactly these fields:

    status: success | partial | failed
    actions_taken:
      - <concise action description> (one line each)
    failures:
      - <what failed>: <why, one line> (omit section if none)
    output: <key result or artifact, if small enough to inline — omit if large>

#### Scenario: success report
- **WHEN** the task completes without errors
- **THEN** the report has `status: success`, a populated `actions_taken` list, an empty or absent `failures` section, and an optional `output` field

#### Scenario: partial completion report
- **WHEN** the task partially completes (some sub-steps succeed, at least one fails)
- **THEN** the report has `status: partial`, lists all attempted actions in `actions_taken`, and lists each failure in `failures`

#### Scenario: failure report
- **WHEN** the task fails immediately or cannot proceed
- **THEN** the report has `status: failed`, a minimal `actions_taken` list reflecting what was attempted, and a populated `failures` section

---

### Requirement: permission-block-aborts
The budget-subagent skill MUST NOT wait for user permission approval. If any tool call would require interactive user approval (permission prompt), the subagent SHALL abort the task immediately and return to the caller with `status: failed` and a `failures` entry identifying the blocked operation and the permission required.

The subagent MUST NOT assume that approval will eventually arrive. Hanging on an unanswered permission prompt is a fatal error.

#### Scenario: permission required mid-task
- **WHEN** the subagent attempts an operation that triggers a permission prompt
- **THEN** it aborts immediately and returns `status: failed` with a message such as "Aborted: operation X requires permission Y — re-run with that permission pre-authorized"

#### Scenario: no silent hang
- **WHEN** a permission prompt is raised and no user is present to approve it
- **THEN** the subagent does not block indefinitely; it reports the permission blocker and exits

---

### Requirement: tool-call soft cap
The budget-subagent skill SHOULD limit itself to approximately 30 tool calls per task invocation. If the task cannot be completed within this budget, it SHALL stop, report `status: partial`, and list remaining work in `failures`.

#### Scenario: cap triggers partial report
- **WHEN** 30 tool calls have been made and the task is not yet complete
- **THEN** the subagent stops, sets `status: partial`, lists completed actions, and describes remaining work in `failures`

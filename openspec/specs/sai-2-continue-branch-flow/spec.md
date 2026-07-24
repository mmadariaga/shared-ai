## ADDED Requirements

### Requirement: The (b) continue-now branch has no review-and-confirm STOP

The (b) "Continue now in this chat" branch of the sai-2-design completion flow (`sai/commands/sai-2-design.md`) SHALL NOT ask the user to review `design.md`, `tasks.md`, and `interfaces.md` and SHALL NOT STOP to wait for a review confirmation before continuing to implementation. The review confirmation is already served by the upstream artifact-feedback-gate (whose `proceed-label` is `Continue`), which fires before the (a)/(b) question is presented; a second review-and-confirm gate inside (b) is redundant and SHALL be absent.

#### Scenario: (b) branch does not ask for a review confirmation

- **WHEN** the user selects (b) "Continue now in this chat" at the implementation-continuation question
- **THEN** the agent does not ask the user to review `design.md`, `tasks.md`, and `interfaces.md`, does not STOP to wait for a confirmation, and proceeds directly with the (b) continuation steps

#### Scenario: the removed sub-step text is absent from the command body

- **WHEN** `sai/commands/sai-2-design.md` is read
- **THEN** the (b) branch does not contain the instruction to "Ask the user to review" the design artifacts "before continuing, and STOP until they confirm"

### Requirement: The (b) branch re-reads artifacts from disk then fetches the shared implement invocation

When the user selects (b) "Continue now in this chat", the agent SHALL re-read `design.md`, `tasks.md`, and `interfaces.md` from disk (they may have changed during a gate iteration), then `Fetch @sai/instructions/implement-invocation.md` and follow it exactly (Load instructions, Run, Completion), using `{name}` as `$ARGUMENTS`. The agent SHALL NOT proceed past that invocation's Completion (that is sai-4-apply's job). These behaviors are preserved verbatim from the pre-change (b) branch — only the preceding review-and-confirm sub-step is removed.

#### Scenario: (b) branch re-reads then hands off directly to implement-invocation

- **WHEN** the user selects (b) "Continue now in this chat"
- **THEN** the agent re-reads `design.md`, `tasks.md`, and `interfaces.md` from disk, fetches `@sai/instructions/implement-invocation.md`, follows its Load/Run/Completion, and stops at that Completion without executing sai-4-apply's work

### Requirement: The (a) branch and the (a)/(b) question are unchanged

This capability SHALL leave the (a) "Stop for a new chat" branch unchanged — including its MANDATORY STOP and its exact printed completion line — and SHALL leave the plain-text (a)/(b) implementation-continuation question, the upstream decision summary, and the artifact-feedback-gate unchanged. Only the review-and-confirm sub-step inside the (b) branch is removed.

#### Scenario: (a) branch preserved verbatim

- **WHEN** the user selects (a) "Stop for a new chat" at the implementation-continuation question
- **THEN** the agent performs its MANDATORY STOP and prints exactly "Design done in openspec/changes/{name}/. Run `/sai-3-implement {name}` **in a new chat** when ready.", identical to the pre-change behavior

#### Scenario: (a)/(b) question stays plain text

- **WHEN** the sai-2-design completion flow reaches the implementation-continuation question after the artifact-feedback-gate
- **THEN** the (a)/(b) question is presented exactly as before this change — it is not converted to a native option-picker and its wording is unchanged

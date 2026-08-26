## MODIFIED Requirements

### Requirement: Scope question autonomy to Plan

Grounded auto-answering and escalation behavior SHALL remain scoped to selector-dispatched Plan (unattended) supervision. Standalone sai-1 and sai-2 commands SHALL retain their existing question behavior.

#### Scenario: Plan receives a worker question

- **WHEN** a supervised Plan worker returns a question
- **THEN** the existing grounded auto-answer-or-escalate rules determine continuation.

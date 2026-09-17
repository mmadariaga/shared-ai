# apply-completion-clarity Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Apply agent completion message SHALL explicitly include human verification gate review and commit steps
When `/sai-4-apply` reaches its completion phase, the agent's stop condition SHALL require that: (1) every Step's **Automated** checkboxes are marked `[x]`, confirmed by the Final sweep, (2) any Functional checkbox still unmarked is reported as pending human review, and (3) commits are done. The human-verification-gate condition is removed, because apply no longer has that gate. The completion message printed to the user SHALL remain: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."

#### Scenario: Apply agent reaches completion
- **WHEN** `/sai-4-apply` has marked every Step's Automated checkboxes, reported any Functional check still pending human review, and created all commits
- **THEN** the agent prints exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready." and stops

#### Scenario: Human verification gates not yet reviewed
- **WHEN** `/sai-4-apply` has marked every Step's Automated checkboxes and created all commits while Functional checks remain unverified
- **THEN** the former blocking behavior no longer applies — the agent presents no verification gate, prints the completion message, and reports the unverified checks as pending human review

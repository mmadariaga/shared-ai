# apply-completion-clarity Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Apply agent completion message SHALL explicitly include human verification gate review and commit steps

When `/sai-4-apply` reaches its completion phase, the agent's stop condition SHALL require that: (1) every Step's **Automated** checkboxes are marked `[x]`, confirmed by the Final sweep, (2) any Functional checkbox still unmarked is reported as pending human review, and (3) commits are done. The human-verification-gate condition remains removed because apply no longer has that gate. The shared closing report SHALL place this unchanged completion message in Next step: "Implementation applied. In a new chat when ready, run `/sai-5-review {name}` for a general review, or `/sai-review {name}` to add specialized audits based on the initial assessment performed by `/sai-5-review`." Execution details SHALL follow as the last report section before the agent stops. An incomplete run SHALL print no completion literal or successful transition; an actual close SHALL use the stopped report with observed partial work and remaining commits, while a pending question SHALL remain a pause.

#### Scenario: Apply agent reaches completion

- **WHEN** `/sai-4-apply` has marked every Step's Automated checkboxes, reported any Functional check still pending human review, and created all commits
- **THEN** the agent prints exactly "Implementation applied. In a new chat when ready, run `/sai-5-review {name}` for a general review, or `/sai-review {name}` to add specialized audits based on the initial assessment performed by `/sai-5-review`." in Next step, prints Execution details last, and stops

#### Scenario: Human verification gates not yet reviewed

- **WHEN** `/sai-4-apply` has marked every Step's Automated checkboxes and created all commits while Functional checks remain unverified
- **THEN** the former blocking behavior remains removed, the agent presents no verification gate, and the completed-with-warnings report preserves every pending human check with its reason and recommendation before the completion message in Next step and Execution details last

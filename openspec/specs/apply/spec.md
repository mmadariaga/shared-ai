# apply Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: Commit message format at STOP & COMMIT markers
When the implementation plan reaches a STOP & COMMIT marker, the agent SHALL apply commit message format rules from `@sai/instructions/commit-rules.md` when proposing the commit message. The commit-rules MUST be loaded at or before the point where the agent drafts a commit message proposal.

#### Scenario: Agent reaches STOP & COMMIT without commit-rules loaded
- **WHEN** `apply.md` is executed and a STOP & COMMIT marker is encountered
- **THEN** the agent MUST have loaded `@sai/instructions/commit-rules.md` before drafting the commit message, ensuring Conventional Commits format, ≤50-char subject, and self-critique checklist are applied

#### Scenario: Commit proposed by apply matches commit-rules constraints
- **WHEN** the agent proposes a commit message at a STOP & COMMIT marker
- **THEN** the proposed subject MUST follow `type(scope): description` format, be ≤ 50 characters, and every claim MUST map to staged hunks only


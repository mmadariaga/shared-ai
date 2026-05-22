# scope-reference-consistency Specification

## ADDED Requirements

### Requirement: All instruction scope reminders SHALL reference `sai-4-apply`

Scope reminder blocks in `sai/instructions/` files (security.md, review.md, performance.md, accessibility.md) SHALL reference `/sai-4-apply` as the apply command, not the legacy `/ai-3-apply`.

#### Scenario: security instruction references sai-4-apply
- **WHEN** `sai/instructions/security.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: review instruction references sai-4-apply
- **WHEN** `sai/instructions/review.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: performance instruction references sai-4-apply
- **WHEN** `sai/instructions/performance.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: accessibility instruction references sai-4-apply
- **WHEN** `sai/instructions/accessibility.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

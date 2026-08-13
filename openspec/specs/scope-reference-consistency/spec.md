# scope-reference-consistency Specification

## ADDED Requirements

### Requirement: All instruction scope reminders SHALL reference `sai-4-apply`

Scope reminder blocks in `sai/commands/{name}/instructions.md` files (security, review, performance, accessibility) SHALL reference `/sai-4-apply` as the apply command, not the legacy `/ai-3-apply`.

#### Scenario: security instruction references sai-4-apply
- **WHEN** `sai/commands/security/instructions.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: review instruction references sai-4-apply
- **WHEN** `sai/commands/review/instructions.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: performance instruction references sai-4-apply
- **WHEN** `sai/commands/performance/instructions.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: accessibility instruction references sai-4-apply
- **WHEN** `sai/commands/accessibility/instructions.md` Remember section is read
- **THEN** the scope reminder references `/sai-4-apply`

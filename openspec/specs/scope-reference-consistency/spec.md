# scope-reference-consistency Specification

## Purpose

Keep the review and audit scope reminders free of the legacy `/ai-3-apply` command name.

## Requirements
### Requirement: Scope reminders SHALL name only the current apply command

The Role section of `sai/commands/review/steps/common.md` SHALL reference `/sai-4-apply` as the apply command. The scope reminders in the Remember sections of the security, performance, and accessibility `sai/commands/{name}/steps/common.md` files SHALL route fixes outside the worker without naming the legacy `/ai-3-apply`.

#### Scenario: security scope reminder names no legacy apply command
- **WHEN** `sai/commands/security/steps/common.md` Remember section is read
- **THEN** the scope reminder does not reference `/ai-3-apply`

#### Scenario: review instruction references sai-4-apply
- **WHEN** `sai/commands/review/steps/common.md` Role section is read
- **THEN** the scope reminder references `/sai-4-apply`

#### Scenario: performance scope reminder names no legacy apply command
- **WHEN** `sai/commands/performance/steps/common.md` Remember section is read
- **THEN** the scope reminder does not reference `/ai-3-apply`

#### Scenario: accessibility scope reminder names no legacy apply command
- **WHEN** `sai/commands/accessibility/steps/common.md` Remember section is read
- **THEN** the scope reminder does not reference `/ai-3-apply`

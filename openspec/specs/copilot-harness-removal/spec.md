# copilot-harness-removal Specification

## Purpose
Retire the Copilot-specific harness instruction file and redistribute its contents to appropriate shared instruction files.

## Requirements

### Requirement: Copilot harness instruction file is retired

`sai/instructions/harness/copilot.md` has been removed. Its OpenSpec path rules now live in `sai/instructions/prereqs.md`. Its checkbox discipline rule now lives in `sai/instructions/remember.md`. The `commands/copilot/*.prompt.md` wrappers no longer fetch this file.

#### Scenario: Copilot wrapper no longer fetches harness file
- **WHEN** a `commands/copilot/*.prompt.md` wrapper is executed
- **THEN** it MUST NOT contain a `Fetch @sai/instructions/harness/copilot.md` directive

#### Scenario: OpenSpec path rules available via prereqs.md
- **WHEN** any sai-* command loads `sai/instructions/prereqs.md`
- **THEN** the OpenSpec path resolution rules (direct paths, no recursive globbing) are present

#### Scenario: Checkbox discipline available via remember.md
- **WHEN** any sai-* command loads `sai/instructions/remember.md`
- **THEN** the checkbox discipline rule (mark `- [ ]` as `- [x]` after verification) is present

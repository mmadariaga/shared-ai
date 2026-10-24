# cache-warmer-pickers Specification

## Purpose
Define native input collection and date confirmation while preserving valid values and the selected target instant.

## Requirements

### Requirement: Native missing-value collection

The skill SHALL ask only for missing or invalid fields through Claude Code's `AskUserQuestion` or opencode's `question`, preserving all other valid values returned by preparation. Interval questions SHALL offer exactly `5 min`, `15 min`, and `45 min`; target questions SHALL offer exactly `now + 1h`, `now + 2h`, and `now + 3h`, with native free-text entry and no duplicate free-text option or chat-rendered menu. Each question SHALL explain the invalid or missing value, the helper's reason, and any other valid value.

#### Scenario: Missing interval only
- **WHEN** the target is valid but the interval is missing
- **THEN** the skill asks only for the interval using the three interval presets and native free-text entry, retaining the resolved target.

#### Scenario: Missing target only
- **WHEN** the interval is valid but the target is missing
- **THEN** the skill asks only for the target using the three target presets and native free-text entry, retaining the interval.

### Requirement: Implicit day-change confirmation

The helper SHALL request native Yes/No date confirmation when a target implies a day change without an explicit date. The skill SHALL show the proposed local date and time, preserve the selected instant on acceptance even across midnight, and discard the old target and its saved instant on rejection while retaining the valid interval.

#### Scenario: Undated local target has passed its margin
- **WHEN** an undated local target plus one minute has already passed
- **THEN** preparation proposes the next day's target and requires date confirmation before starting.

#### Scenario: Relative target crosses midnight
- **WHEN** a relative target crosses into another day without an explicit date
- **THEN** preparation requests confirmation of that date and accepting it retains the exact original target including seconds and milliseconds.

#### Scenario: Date is rejected
- **WHEN** the user rejects the proposed date
- **THEN** the skill asks for a replacement target with the target presets and native free-text entry, without retaining the rejected target's resolved instant.

# implement-rerun-guard-enhancement Specification

## ADDED Requirements

### Requirement: Implement instruction SHALL include Step 1b for detecting already-applied steps

When `openspec/changes/{change-name}/implementation.md` already exists before `/sai-3-implement` runs, the instruction SHALL direct the agent to:
1. Read the existing file
2. Identify every `#### Step N:` section where all checkboxes are `[x]`
3. Emit only `*(already applied)*` for fully-checked steps in the regenerated output
4. Leave steps with at least one unchecked `- [ ]` as-is

If `implementation.md` does not exist, this detection step is skipped entirely.

#### Scenario: fully-applied step collapsed
- **WHEN** a step section has all checkboxes marked `[x]`
- **THEN** the regenerated output contains only the step heading followed by `*(already applied)*`

#### Scenario: partially-applied step preserved
- **WHEN** a step section contains at least one `- [ ]` checkbox
- **THEN** that step is emitted in full from the existing file

#### Scenario: no existing implementation file
- **WHEN** `implementation.md` does not exist
- **THEN** Step 1b is skipped entirely

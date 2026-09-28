# implement-rerun-guard Specification
## Purpose

Collapse already-applied steps when `/sai-3-implement` re-runs on an existing `implementation.md`.

## Requirements
### Requirement: `/sai-3-implement` instruction SHALL include a re-run guard step for detecting already-applied steps

When `openspec/changes/{change-name}/implementation.md` already exists before `/sai-3-implement` runs, the instruction SHALL direct the agent to:
1. Read the existing file
2. Identify every `#### Step N:` section where all checkboxes are `[x]`
3. Emit only `*(already applied)*` for fully-checked steps in the collapsed `implementation.md` that the `collapse-implemented-steps` step writes back
4. Leave steps with at least one unchecked `- [ ]` as-is

If `implementation.md` does not exist, this detection step is skipped entirely.

#### Scenario: fully-applied step collapsed
- **WHEN** a step section has all checkboxes marked `[x]`
- **THEN** the collapsed `implementation.md` that Step 1 writes back contains only the step heading followed by `*(already applied)*`

#### Scenario: partially-applied step preserved
- **WHEN** a step section contains at least one `- [ ]` checkbox
- **THEN** that step is emitted in full from the existing file

#### Scenario: no existing implementation file
- **WHEN** `implementation.md` does not exist
- **THEN** the `collapse-implemented-steps` step is not delivered

### Requirement: `/sai-3-implement` MUST skip fully-applied steps when `implementation.md` already exists

When `openspec/changes/{change-name}/implementation.md` exists before `/sai-3-implement` runs, the agent SHALL read the file, identify every `#### Step N:` section where all checkboxes are `[x]`, and emit only `*(already applied)*` in place of that step's full content in the collapsed `implementation.md` that the `collapse-implemented-steps` step writes back. Steps with at least one unchecked `- [ ]` checkbox SHALL be emitted in full.

If `implementation.md` does not exist, this detection step is skipped entirely.

#### Scenario: all steps applied — full collapse

- **WHEN** `implementation.md` exists and every checkbox in every step is `[x]`
- **THEN** the final `implementation.md` that the plan-generation step produces contains only step headings followed by `*(already applied)*`, with no code blocks or checklists

#### Scenario: partial progress — mixed steps

- **WHEN** `implementation.md` exists and some steps are fully checked while others have at least one `- [ ]`
- **THEN** fully-checked steps are collapsed to `*(already applied)*` and steps with any unchecked box are emitted in full

#### Scenario: single unchecked box preserves full step

- **WHEN** a step section contains one `- [ ]` among multiple `- [x]` entries
- **THEN** that step is NOT collapsed — it appears in full in the final `implementation.md` that the plan-generation step produces

#### Scenario: no existing implementation file

- **WHEN** `implementation.md` does not exist at the change path
- **THEN** the `collapse-implemented-steps` step is not delivered and the full implementation plan is generated from scratch


# implement-rerun-state-classification Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: the plan-generation step SHALL classify each prior step as APPLIED, VERIFY-PENDING, or INCOMPLETE

On re-run, the plan-generation step (`sai/commands/implement/steps/plan-generation.md`) SHALL classify every step in the prior `implementation.md` from its checkbox state, distinguishing code-writing checkboxes from verification checkboxes. A **code-writing checkbox** is one whose line introduces or modifies project files (an instruction box, a RED stub/test-creation box, or a GREEN implementation box). A **verification checkbox** is one that only runs or inspects (a Verification Checklist box, a "Verify RED" / GATE box, or a "Verify GREEN" box). The classifications are:

- **APPLIED** — every checkbox in the step is `[x]` (the collapse step will already have collapsed it to `*(already applied)*`).
- **VERIFY-PENDING** — every code-writing checkbox is `[x]` but at least one verification checkbox is `[ ]`.
- **INCOMPLETE** — at least one code-writing checkbox is `[ ]`.

Classification is derived from checkbox state only, not from commit history.

#### Scenario: all boxes checked is APPLIED

- **WHEN** a step has every checkbox marked `[x]`
- **THEN** the plan-generation step classifies it APPLIED

#### Scenario: code applied but verification pending is VERIFY-PENDING

- **WHEN** a step's code-writing checkboxes are all `[x]` but at least one verification checkbox is `[ ]`
- **THEN** the plan-generation step classifies it VERIFY-PENDING

#### Scenario: unwritten code is INCOMPLETE

- **WHEN** a step has at least one code-writing checkbox left `[ ]`
- **THEN** the plan-generation step classifies it INCOMPLETE

### Requirement: An INCOMPLETE prior step SHALL halt the re-run

When the plan-generation step classifies any prior step as INCOMPLETE, it SHALL return `failed` before appending audit-derived steps, naming the incomplete step, because downstream audit steps would otherwise be generated on the false premise that the step's code exists.

#### Scenario: re-run stops on incomplete step

- **WHEN** at least one prior step is classified INCOMPLETE
- **THEN** the plan-generation step returns `failed` naming the incomplete step
- **AND** it does NOT append any audit-derived steps

#### Scenario: no incomplete steps allows continuation

- **WHEN** no prior step is classified INCOMPLETE
- **THEN** the plan-generation step proceeds to preserve the prior steps and append audit-derived steps

### Requirement: A VERIFY-PENDING prior step SHALL warn and continue best-effort

When the plan-generation step classifies a prior step as VERIFY-PENDING (code applied, verification pending) and no step is INCOMPLETE, it SHALL emit a warning naming the affected step(s) and continue the re-run on a best-effort basis. A VERIFY-PENDING classification MUST NOT, by itself, halt the run.

#### Scenario: verification gap warns but proceeds

- **WHEN** a prior step is VERIFY-PENDING and no step is INCOMPLETE
- **THEN** the plan-generation step warns the user, naming the affected step
- **AND** it continues preserving prior steps and appending audit-derived steps

#### Scenario: VERIFY-PENDING alone does not stop the run

- **WHEN** the only non-APPLIED steps are VERIFY-PENDING
- **THEN** the plan-generation step does not halt on their account

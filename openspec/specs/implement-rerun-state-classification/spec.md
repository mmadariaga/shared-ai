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

The plan-generation step SHALL evaluate the INCOMPLETE gate as the precondition for appending audit-derived steps, not during classification. When at least one audit artifact (`review.md`, `security.md`, `performance.md`, or `accessibility.md`) needs a new audit step and any prior step is classified INCOMPLETE, it SHALL return `failed` before preserving or appending anything. The `failed` summary SHALL name each INCOMPLETE step, the audit artifacts that need a new audit step, and the next action: run `/sai-4-apply <change>` to finish the pending Steps, then re-plan. Downstream audit steps would otherwise be generated on the false premise that the pending steps' code exists. When no audit artifact needs a new audit step, INCOMPLETE steps SHALL NOT halt the re-run: the prior file is preserved byte-for-byte, the run ends `completed`, and the terminal `summary` lists the pending Steps that apply will run.

#### Scenario: re-run stops on incomplete step

- **WHEN** at least one prior step is classified INCOMPLETE and at least one audit artifact needs a new audit step
- **THEN** the plan-generation step returns `failed` naming each INCOMPLETE step, the audit artifacts needing a new step, and the next action `/sai-4-apply <change>` then re-plan
- **AND** it does NOT preserve the prior file and does NOT append any audit-derived steps

#### Scenario: incomplete steps without a new audit step do not halt

- **WHEN** at least one prior step is classified INCOMPLETE and no audit artifact needs a new audit step
- **THEN** the plan-generation step preserves the prior `implementation.md` byte-for-byte and ends `completed`
- **AND** the terminal `summary` lists the pending Steps that apply will run

#### Scenario: no incomplete steps allows continuation

- **WHEN** no prior step is classified INCOMPLETE
- **THEN** the plan-generation step proceeds to preserve the prior steps and append audit-derived steps

### Requirement: A VERIFY-PENDING prior step SHALL warn and continue best-effort

When the plan-generation step classifies a prior step as VERIFY-PENDING (code applied, verification pending), it SHALL emit a warning naming the affected step(s) in the terminal `summary` and continue the re-run on a best-effort basis, including when INCOMPLETE steps are present and the run ends `completed`. A VERIFY-PENDING classification MUST NOT, by itself, halt the run.

#### Scenario: verification gap warns but proceeds

- **WHEN** a prior step is VERIFY-PENDING and no step is INCOMPLETE
- **THEN** the plan-generation step warns the user, naming the affected step
- **AND** it continues preserving prior steps and appending audit-derived steps

#### Scenario: VERIFY-PENDING alone does not stop the run

- **WHEN** the only non-APPLIED steps are VERIFY-PENDING
- **THEN** the plan-generation step does not halt on their account

#### Scenario: VERIFY-PENDING warning accompanies pending Steps

- **WHEN** a prior step is VERIFY-PENDING, another is INCOMPLETE, and no audit artifact needs a new audit step
- **THEN** the terminal `summary` lists both the VERIFY-PENDING warning and the pending Steps
- **AND** the run ends `completed`

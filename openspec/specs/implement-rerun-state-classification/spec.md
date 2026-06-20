## ADDED Requirements

### Requirement: Step 5 SHALL classify each prior step as COMPLETO, FALLO MENOR, or INCOMPLETO

On re-run, Step 5 of `sai/instructions/implement.md` SHALL classify every step in the prior `implementation.md` from its checkbox state, distinguishing code-writing checkboxes from verification checkboxes. A **code-writing checkbox** is one whose line introduces or modifies project files (an instruction box, a RED stub/test-creation box, or a GREEN implementation box). A **verification checkbox** is one that only runs or inspects (a Verification Checklist box, a "Verify RED" / GATE box, or a "Verify GREEN" box). The classifications are:

- **COMPLETO** — every checkbox in the step is `[x]` (Step 1 will already have collapsed it to `*(already applied)*`).
- **FALLO MENOR** — every code-writing checkbox is `[x]` but at least one verification checkbox is `[ ]`.
- **INCOMPLETO** — at least one code-writing checkbox is `[ ]`.

Classification is derived from checkbox state only, not from commit history.

#### Scenario: all boxes checked is COMPLETO

- **WHEN** a step has every checkbox marked `[x]`
- **THEN** Step 5 classifies it COMPLETO

#### Scenario: code applied but verification pending is FALLO MENOR

- **WHEN** a step's code-writing checkboxes are all `[x]` but at least one verification checkbox is `[ ]`
- **THEN** Step 5 classifies it FALLO MENOR

#### Scenario: unwritten code is INCOMPLETO

- **WHEN** a step has at least one code-writing checkbox left `[ ]`
- **THEN** Step 5 classifies it INCOMPLETO

### Requirement: An INCOMPLETO prior step SHALL halt the re-run

When Step 5 classifies any prior step as INCOMPLETO, it SHALL STOP before appending audit-derived steps and report to the user which step is incomplete, because downstream audit steps would otherwise be generated on the false premise that the step's code exists.

#### Scenario: re-run stops on incomplete step

- **WHEN** at least one prior step is classified INCOMPLETO
- **THEN** Step 5 STOPs and reports the incomplete step to the user
- **AND** it does NOT append any audit-derived steps

#### Scenario: no incomplete steps allows continuation

- **WHEN** no prior step is classified INCOMPLETO
- **THEN** Step 5 proceeds to preserve the prior steps and append audit-derived steps

### Requirement: A FALLO MENOR prior step SHALL warn and continue best-effort

When Step 5 classifies a prior step as FALLO MENOR (code applied, verification pending) and no step is INCOMPLETO, it SHALL emit a warning naming the affected step(s) and continue the re-run on a best-effort basis. A FALLO MENOR classification MUST NOT, by itself, halt the run.

#### Scenario: verification gap warns but proceeds

- **WHEN** a prior step is FALLO MENOR and no step is INCOMPLETO
- **THEN** Step 5 warns the user, naming the affected step
- **AND** it continues preserving prior steps and appending audit-derived steps

#### Scenario: FALLO MENOR alone does not stop the run

- **WHEN** the only non-COMPLETO steps are FALLO MENOR
- **THEN** Step 5 does NOT STOP on their account

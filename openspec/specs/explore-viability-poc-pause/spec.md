# explore-viability-poc-pause Specification

## Purpose
TBD

## Requirements

### Requirement: pause feature emission for an explicit viability decision

When the technical-uncertainty assessment fires, `sai-explore` SHALL withhold feature `Ready to Propose` blocks and present Ask 1 through the active harness-native picker. The fixed context SHALL explain the unused third party, the documentation gap, the disposable POC, the Direct Build `--no-specs` profile, the absence of backfill/spec/archive work, and the fact that the POC is not a feature slice.

Ask 1 SHALL present exactly these options in order:

- `Yes, create a POC before continuing`
- `No. Crystallize the full change`

`--fast-track` SHALL not auto-approve or bypass Ask 1.

#### Scenario: uncertainty pauses before the language gate

- **WHEN** the technical-uncertainty assessment fires during an explicit crystallization request
- **THEN** no feature block or crystallization-language question is emitted until Ask 1 resolves

#### Scenario: the user declines the POC

- **WHEN** the user selects `No. Crystallize the full change`
- **THEN** `sai-explore` proceeds to the applicable single-block or sliced protocol with the initial size and friction assessment and does not re-litigate the POC choice

#### Scenario: fast-track preserves Ask 1

- **WHEN** `--fast-track` is active while the technical-uncertainty assessment has fired
- **THEN** Ask 1 is still presented and the flag does not bypass the uncertainty pause

### Requirement: post-POC menus remain explicit and verdict-specific

After a POC, `sai-explore` SHALL determine whether the result is viable from green POC tests or explicit human confirmation, or not viable from red POC tests or explicit human rejection. A viable result SHALL present exactly `Crystallize full`, `Exit`, and `Free text` in order. A not-viable result SHALL collect failure feedback and present exactly `Re-explore with feedback` and `Exit, idea dead` in order.

`Exit` after a viable POC SHALL not mark the idea discarded. `Exit, idea dead` after a not-viable POC SHALL mark the idea discarded. `Free text` and `Re-explore with feedback` SHALL not advance without the required additional input or re-exploration.

#### Scenario: viable POC offers crystallization or exit

- **WHEN** the POC tests are green or the user confirms that the POC works
- **THEN** the picker presents `Crystallize full`, `Exit`, and `Free text` in that order

#### Scenario: viable crystallization re-evaluates routing

- **WHEN** the user selects `Crystallize full` after a viable POC
- **THEN** `sai-explore` re-runs size and friction assessment and then emits feature blocks through the applicable crystallization protocol

#### Scenario: viable exit preserves the active idea

- **WHEN** the user selects `Exit` after a viable POC
- **THEN** explore emits no feature block and leaves the idea `active-uncrystallized` rather than marking it discarded

#### Scenario: not-viable POC collects feedback

- **WHEN** the POC tests are red or the user says that the POC fails
- **THEN** explore collects feedback about what went wrong before presenting the not-viable picker

#### Scenario: not-viable exit discards the idea

- **WHEN** the user selects `Exit, idea dead` after a not-viable POC
- **THEN** the Closure State becomes `discarded` and no feature block is emitted

#### Scenario: fast-track preserves post-POC menus

- **WHEN** `--fast-track` is active after a POC reaches either a viable or not-viable verdict
- **THEN** the applicable post-POC picker is still presented and is not auto-approved

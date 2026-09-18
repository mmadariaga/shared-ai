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

### Requirement: The viability POC lane is an independently loadable step

The viability-POC lane SHALL be stated in exactly one step file, `sai/commands/explore/steps/poc-lane.md`, which owns the uncertainty pause, Ask 1, the Direct Build `--no-specs` execution, the verdict, and both post-POC menus. `sai/commands/explore/steps/crystallization-protocol.md` SHALL state no part of the lane and SHALL instead emit the routing-only `poc-lane` intent to `explore-idea@1` and follow the returned `next.follow`. The lane file SHALL be follow-loaded through `next.follow` and SHALL NOT be reached by a nested `Fetch @` directive. The extraction SHALL be behavior-preserving: the trigger condition, the Ask 1 context and its two options in their fixed order, the verdict determination, and both post-POC menus remain as previously stated, and `--fast-track` still neither auto-approves nor bypasses Ask 1 or the post-POC menus.

#### Scenario: the pause is entered through the lane step

- **WHEN** the technical-uncertainty assessment fires during an explicit crystallization request
- **THEN** the crystallization protocol emits the `poc-lane` intent and the pause is presented from `poc-lane.md`, with no feature block and no crystallization-language question emitted first

#### Scenario: the lane file is the single source of the lane text

- **WHEN** the crystallization protocol is read
- **THEN** it contains no Ask 1 option label, no post-POC menu entry, and no `Fetch` directive naming `poc-lane.md`, while `poc-lane.md` contains all of them

### Requirement: Crystallization resumes through the lane return route

The lane SHALL re-enter the crystallization protocol only on the branches that resume it — Ask 1 `No. Crystallize the full change`, and `Crystallize full` after a viable POC — by emitting the routing-only `crystallize-resume` intent to `explore-idea@1` and following the returned `next.follow`. On a resume without a POC the initial size and friction assessments SHALL still hold; on a resume after a completed POC size and friction SHALL be re-assessed against the post-POC repository before the single-change or sliced protocol runs. The `Exit`, `Free text`, `Re-explore with feedback`, and `Exit, idea dead` branches SHALL NOT emit the return intent and SHALL keep their existing behavior.

#### Scenario: declining the POC returns to crystallization

- **WHEN** the user selects `No. Crystallize the full change`
- **THEN** the lane emits `crystallize-resume`, the pointer returns to the crystallization protocol, and the applicable protocol runs with the initial size and friction assessments

#### Scenario: exit branches do not return through the machine

- **WHEN** the user selects `Exit` after a viable POC or `Exit, idea dead` after a not-viable POC
- **THEN** no `crystallize-resume` intent is emitted and the existing closure behavior for that branch applies

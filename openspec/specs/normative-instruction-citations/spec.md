# normative-instruction-citations Specification

## Purpose
Keeps citations in normative instructions pointed at the file that defines the cited behavior, so a reader who follows one lands on the rule itself.

## Requirements

### Requirement: explore-item-10 citations resolve to defining step files

Explore item 10 (Plan / Direct Build supervision contract) citations in normative instructions SHALL be attributed to the step file that defines or owns the cited behavior, not to an intermediate or index file.

#### Scenario: Item 10 artifact feedback gate citation

- **WHEN** normative instructions are scanned for an artifact feedback gate citation of explore item 10
- **THEN** none exists, because the gate is retired and the Plan route follows `/sai-plan` from `sai/commands/explore/steps/pipeline-plan-unattended.md`

#### Scenario: Item 10 route selector citation

- **WHEN** `sai/policies/question-context.md` cites explore's crystallization-close selector
- **THEN** the citation names `sai/commands/explore/steps/route-selector.md`, the step that defines the selector labels

### Requirement: implement testability-rule citations resolve to the rule's current location

Citations to the implement testability rule in normative instructions SHALL resolve to the files where the rule currently resides: the RED acceptance in `sai/commands/implement/coordinator.md` (RED closes only when the step's tests fail by assertion on the behavior under test) and the no-meaningful-test rule in `sai/commands/implement/steps/red-step.md`. A citation SHALL name the file, never a line number.

#### Scenario: Testability rule current location

- **WHEN** a normative instruction cites the implement testability rule
- **THEN** the citation names `sai/commands/implement/coordinator.md` or `sai/commands/implement/steps/red-step.md`, where the rule resides, rather than a line number

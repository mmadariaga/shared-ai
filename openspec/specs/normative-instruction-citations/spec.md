# normative-instruction-citations Specification

## Purpose
TBD - created by archiving change repair-dead-cross-references. Update Purpose after archive.
## Requirements
### Requirement: explore-item-10 citations resolve to defining step files

Explore item 10 (Plan / Direct Build supervision contract) citations in normative instructions SHALL be attributed to the step file that defines or owns the cited behavior, not to an intermediate or index file.

#### Scenario: Item 10 artifact feedback gate citation

- **WHEN** `sai/policies/artifact-feedback-gate.md` cites explore item 10 as the dispatch point for the gate during Plan (unattended)
- **THEN** the citation names `sai/commands/explore/steps/pipeline-plan-unattended.md`, the step that owns the fetch point

#### Scenario: Item 10 route selector citation

- **WHEN** `sai/policies/question-context.md` cites explore's crystallization-close selector
- **THEN** the citation names `sai/commands/explore/steps/route-selector.md`, the step that defines the selector labels

### Requirement: implement testability-rule citations resolve to the rule's current location

Citations to the implement testability rule in normative instructions SHALL resolve to the line where the rule currently resides.

#### Scenario: Testability rule current location

- **WHEN** `sai/commands/implement/instructions.md` and `sai/commands/implement/steps/plan-generation.md` cite the testability rule
- **THEN** the citations point to `sai/commands/implement/instructions.md:161`, where the rule currently resides


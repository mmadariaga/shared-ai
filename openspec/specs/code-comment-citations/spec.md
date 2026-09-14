# code-comment-citations Specification

## Purpose
TBD - created by archiving change repair-dead-cross-references. Update Purpose after archive.
## Requirements
### Requirement: derivation-rule comments cite the policy that states the equivalent derivation

Code comments that derive or explain a deterministic rule SHALL cite the policy or specification that independently states the same derivation, when one exists.

#### Scenario: Apply standalone state derivation comment

- **WHEN** `sai-state/machines/apply-standalone.js:83` comments on the checkbox-marked state derivation rule (fully-marked Step is done, first not-fully-marked is active, rest pending)
- **THEN** the comment references `sai/policies/todo-structure.md:27-32` as the equivalent derivation, grounding the comment in the single source of the rule


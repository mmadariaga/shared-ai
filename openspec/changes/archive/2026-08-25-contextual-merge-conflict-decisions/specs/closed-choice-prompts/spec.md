# closed-choice-prompts Specification

## MODIFIED Requirements

### Requirement: Contextual merge decisions use native picker semantics

A contextual merge decision SHALL use the harness's native option-picker whenever available. The ordered internal values SHALL remain stable as `ours`, `theirs`, optional `synthesis`, and `more-context`; a synthesis option SHALL appear only when a complete safe synthesis exists. Invalid free-text selections SHALL follow the defining instruction's re-prompt behavior.

#### Scenario: Semantic decision is presented through the native picker

- **WHEN** a supported harness receives a contextual merge decision with a closed set of complete outcomes
- **THEN** the coordinator presents the exact ordered options through the native picker without changing their values or meanings

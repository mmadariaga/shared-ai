# question-context-policy Specification

## MODIFIED Requirements

### Requirement: Contextual merge questions provide complete decision context

A semantic merge decision prompt SHALL name the conflict, explain why the choice matters, describe each complete behavioral option in plain language, include affected state and contracts, and distinguish the decision from a text-fragment choice. The question source SHALL comply with the canonical question-context policy.

#### Scenario: Contextual question supports an informed choice

- **WHEN** the worker asks the user to choose an outcome for a semantic merge conflict
- **THEN** the prompt and adjacent worker-authored context identify the affected behavior, alternatives, trade-offs, and current decision state in plain language

## ADDED Requirements

### Requirement: Interview questions asked sequentially

The backfill command SHALL ask the two fixed interview questions one at a time, waiting for the user's full response to each question before proceeding to the next. Both questions MUST NOT be asked in the same message.

#### Scenario: Question 1 asked first
- **WHEN** Phase 2 interview begins
- **THEN** only Question 1 ("What problem does this solve?") is presented; the agent waits for the user's response

#### Scenario: Question 2 asked after Question 1 answered
- **WHEN** the user provides a complete answer to Question 1
- **THEN** Question 2 ("What are the known limitations or technical debt left behind?") is presented; the agent waits for the user's response

#### Scenario: No merged questions
- **WHEN** the interview begins
- **THEN** the two fixed questions are never combined into a single message regardless of diff complexity

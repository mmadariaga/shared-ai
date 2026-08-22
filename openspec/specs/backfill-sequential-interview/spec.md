## Requirements

### Requirement: Interview questions asked sequentially

The backfill command SHALL present the two fixed interview questions one at a time, waiting for the user's full response to each question before proceeding, only for questions that remain unanswered after crystallized-block resolution. When block resolution answers both questions, the interview presents no message and the flow continues to adaptive evaluation; when one remains, it alone is presented sequentially.

#### Scenario: Both questions resolved by the block
- **WHEN** block resolution answered Question 1 and Question 2
- **THEN** no interview turn is emitted and neither question reaches the user

#### Scenario: One question survives resolution
- **WHEN** only Question 2 lacks a derivable answer
- **THEN** Question 2 alone is presented and the command waits for the user's full response before continuing

#### Scenario: No merged questions
- **WHEN** more than one interview question is presented
- **THEN** the questions appear in separate messages, never combined into one

### Requirement: Sequential interview keeps pinned free-text delivery

The backfill command SHALL preserve one-at-a-time ordering and the response wait between the two fixed questions while emitting each question once as ordinary free text, without native option-picker routing.

#### Scenario: Question delivery remains sequential
- **WHEN** Question 1 is emitted
- **THEN** the command waits for the user's full response before emitting Question 2, and neither question is duplicated through a question tool

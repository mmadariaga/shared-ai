## Requirements

### Requirement: Two fixed questions always asked

After reading the diff, the command SHALL resolve the following two questions through the crystallized-block chain before presenting either — each resolving label-first, then mined prose, then the ask: (1) "What problem does this solve?", mapped to the block's `**Why**` value; (2) "What are the known limitations or technical debt left behind?", mapped to the block's accepted trade-offs and constraint non-goals. A question whose answer resolves from the block or the mined prose SHALL NOT be presented; a question with no derivable answer SHALL be asked exactly as written. When no crystallized block was detected, both questions SHALL always be asked, in this order, one at a time, sequentially, regardless of diff content, waiting for the user's full response between them; they MUST NOT be asked in the same message, skipped, rephrased, or merged.

#### Scenario: Block answers both fixed questions
- **WHEN** a detected crystallized block supplies derivable values for both mapped fields
- **THEN** neither question is presented and both resolved values serve as their fixed answers

#### Scenario: Partially derivable answers
- **WHEN** the block yields an answer for Question 1 but none for Question 2
- **THEN** Question 2 alone is asked exactly as written

#### Scenario: Fixed questions asked without a block
- **WHEN** no crystallized block was detected
- **THEN** both fixed questions are still asked sequentially before any output is written

### Requirement: Adaptive questions asked only when diff creates genuine gaps
After the two fixed questions, the command MAY ask targeted follow-up questions generated from the diff if — and only if — there is a specific aspect the AI cannot confidently spec without more information. Examples of genuine gaps: a new DB migration where rollback behavior is unspecified, a new public API endpoint where the request/response contract is ambiguous.

The command SHALL NOT ask adaptive questions to gather "nice to have" context. The default when in doubt is to ask nothing beyond the two fixed questions.

#### Scenario: No adaptive questions for a straightforward diff
- **WHEN** the diff changes a function with clear inputs, outputs, and side effects
- **THEN** no adaptive questions are asked after the two fixed questions

#### Scenario: Adaptive question asked for unspecified rollback
- **WHEN** the diff contains a new irreversible DB migration with no rollback script
- **THEN** one targeted question about rollback behavior is asked

#### Scenario: Maximum adaptive question discipline
- **WHEN** the diff contains multiple ambiguous areas
- **THEN** only the ambiguities that are strictly necessary for spec accuracy are asked; all "would be useful" questions are omitted

### Requirement: All answers collected before any artifact is written
The command SHALL collect answers to all questions (fixed + adaptive) before writing `proposal.md` or any spec file.

#### Scenario: Artifact generation gated on interview completion
- **WHEN** the user answers the last question
- **THEN** conflict detection runs and artifact writing begins; no artifact is written mid-interview

### Requirement: Interview questions use single free-text delivery

The backfill command SHALL emit each fixed or adaptive interview question exactly once as ordinary conversation text and SHALL end the turn there. These open-ended questions SHALL not be routed through the harness option-picker or question tool and SHALL not be echoed or restated in the same turn.

#### Scenario: Fixed question is emitted once
- **WHEN** a fixed interview question is asked
- **THEN** the user sees one ordinary conversation question and no duplicate picker rendering

#### Scenario: Adaptive question uses the same delivery
- **WHEN** a genuine gap requires an adaptive question
- **THEN** it uses the same single free-text delivery mechanism as the fixed questions

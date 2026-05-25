## MODIFIED Requirements

### Requirement: Two fixed questions always asked

After reading the diff, the command SHALL always ask the user exactly the following two questions, in this order, **one at a time, sequentially**, regardless of diff content:

1. "What problem does this solve?"
2. "What are the known limitations or technical debt left behind?"

After each question, the command SHALL wait for the user's full response before proceeding to the next. Both questions MUST NOT be asked in the same message. These questions are not skipped, rephrased, or merged even if the diff appears self-explanatory.

#### Scenario: Fixed questions asked for a trivial diff
- **WHEN** the diff is a one-line rename with obvious intent
- **THEN** both fixed questions are still asked sequentially before any output is written

#### Scenario: Fixed questions asked for a complex diff
- **WHEN** the diff spans multiple files and subsystems
- **THEN** both fixed questions are still asked sequentially before any output is written

#### Scenario: Fixed question order preserved
- **WHEN** the interview begins
- **THEN** question 1 ("What problem does this solve?") is asked before question 2 ("What are the known limitations...")

#### Scenario: No merged questions
- **WHEN** the interview begins
- **THEN** the two questions are presented in separate messages, not combined

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
